import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { ClientInfo } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';
import { CacheService } from 'src/shared/services';
import { FirebaseService } from 'src/shared/services/firebase/firebase.service';
import {
  CreateDeviceTokenDto,
  LoginDto,
  RegisterDto,
  UpdatePasswordDto,
} from 'src/users/dto';
import { User } from 'src/users/entities';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { FirebaseLoginDto, OtpRequestDto, OtpVerifyDto } from './dto';
import { OtpData } from './interfaces';
import { MailerEmailOtpSender, RedisOtpStore } from './providers';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let cacheService: jest.Mocked<CacheService>;
  let otpStore: jest.Mocked<RedisOtpStore>;
  let emailOtpSender: jest.Mocked<MailerEmailOtpSender>;
  let firebaseService: jest.Mocked<FirebaseService>;

  // Mock data
  const mockUser: Partial<User> = {
    id: '123456789',
    uuid: 'user-uuid-123',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    password: 'hashedPassword123',
    role: 'user',
    status: 'active',
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClientInfo: ClientInfo = {
    userAgent: 'Mozilla/5.0 (Test Browser)',
    ipAddress: '192.168.1.1',
    deviceType: 'desktop',
    browser: 'Chrome',
    operatingSystem: 'Windows',
  };

  const mockAuthPayload: AuthPayload = {
    uid: '123456789',
    ssid: 'session-123',
    role: 'user',
  };

  const mockSession = {
    id: 'session-123',
    userId: '123456789',
    revoked: false,
    isExpired: () => false,
    isValid: () => true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  const mockOtpData: OtpData = {
    code: '123456',
    email: 'test@example.com',
    createdAt: Date.now(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
    attempts: 0,
    maxAttempts: 5,
    isUsed: false,
    requestId: 'req-123',
  };

  const mockFirebaseUser = {
    uid: 'firebase-uid-123',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    picture: 'https://example.com/photo.jpg',
    firebase: {
      sign_in_provider: 'google.com',
      identities: {
        'google.com': ['test@example.com'],
        email: ['test@example.com'],
      },
    },
    aud: 'test-audience',
    auth_time: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600,
    iat: Date.now() / 1000,
    iss: 'https://securetoken.google.com/test-project',
    sub: 'firebase-uid-123',
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockUsersService = {
      register: jest.fn(),
      findOne: jest.fn(),
      findByEmail: jest.fn(),
      findByFirebaseUid: jest.fn(),
      createFromFirebase: jest.fn(),
      findById: jest.fn(),
      updateUser: jest.fn(),
      createSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeSessionsByUserId: jest.fn(),
      findSessionById: jest.fn(),
      createDeviceToken: jest.fn(),
      findSessionsByUserId: jest.fn(),
      findSessionsByUserIdCursor: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockCacheService = {
      set: jest.fn(),
      deleteKeysBySuffix: jest.fn(),
    };

    const mockOtpStore = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      incrementAttempts: jest.fn(),
      markAsUsed: jest.fn(),
    };

    const mockEmailOtpSender = {
      sendOtp: jest.fn(),
    };

    const mockFirebaseService = {
      authenticate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: RedisOtpStore,
          useValue: mockOtpStore,
        },
        {
          provide: MailerEmailOtpSender,
          useValue: mockEmailOtpSender,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    cacheService = module.get(CacheService);
    otpStore = module.get(RedisOtpStore);
    emailOtpSender = module.get(MailerEmailOtpSender);
    firebaseService = module.get(FirebaseService);

    // Setup default mock implementations
    configService.get.mockImplementation((key: string) => {
      const configs = {
        'app.jwt.accessTokenExpiresIn': 3600, // Return number instead of string
        'app.jwt.refreshTokenExpiresIn': 604800, // 7 days in seconds
      };
      return configs[key];
    });

    jwtService.signAsync.mockResolvedValue('mock-jwt-token');
    usersService.createSession.mockResolvedValue(mockSession as any);
    cacheService.set.mockResolvedValue(undefined);
    cacheService.deleteKeysBySuffix.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
        name: 'New User',
      };

      usersService.register.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.register(registerDto, mockClientInfo);

      // Assert
      expect(usersService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toHaveProperty('messageKey', 'user.REGISTER_SUCCESS');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('user', mockUser);
      expect(result.data).toHaveProperty('token');
    });

    it('should handle registration errors', async () => {
      // Arrange
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'existing',
        name: 'Existing User',
      };

      const error = new HttpException(
        { messageKey: 'user.EMAIL_ALREADY_EXISTS' },
        HttpStatus.BAD_REQUEST,
      );
      usersService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.register(registerDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Act
      const result = await service.login(loginDto, mockClientInfo);

      // Assert
      expect(usersService.findOne).toHaveBeenCalledWith({
        email: loginDto.email,
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(result).toHaveProperty('messageKey', 'user.LOGIN_SUCCESS');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('user', mockUser);
      expect(result.data).toHaveProperty('token');
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      usersService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto, mockClientInfo)).rejects.toThrow(
        HttpException,
      );
      expect(usersService.findOne).toHaveBeenCalledWith({
        email: loginDto.email,
      });
    });

    it('should throw error when password is invalid', async () => {
      // Arrange
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      usersService.findOne.mockResolvedValue(mockUser as User);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login(loginDto, mockClientInfo)).rejects.toThrow(
        HttpException,
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });
  });

  describe('generateToken', () => {
    it('should generate access and refresh tokens', async () => {
      // Arrange
      const mockAccessToken = 'access-token-123';
      const mockRefreshToken = 'refresh-token-123';

      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      const result = await service.generateToken(
        mockUser as User,
        mockClientInfo,
      );

      // Assert
      expect(usersService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        metadata: { ...mockClientInfo, uuid: mockUser.uuid },
        ipAddress: mockClientInfo.ipAddress || 'unknown',
        userAgent: mockClientInfo.userAgent || 'unknown',
        expiresAt: expect.any(Date),
      });

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      usersService.revokeSession.mockResolvedValue(undefined);
      cacheService.deleteKeysBySuffix.mockResolvedValue(0);

      // Act
      const result = await service.logout(mockAuthPayload);

      // Assert
      expect(usersService.revokeSession).toHaveBeenCalledWith(
        mockAuthPayload.ssid,
      );
      expect(cacheService.deleteKeysBySuffix).toHaveBeenCalledWith(
        `*${mockAuthPayload.ssid}`,
      );
      expect(result).toHaveProperty('messageKey', 'user.LOGOUT_SUCCESS');
    });
  });

  describe('logoutAll', () => {
    it('should logout user from all devices', async () => {
      // Arrange
      usersService.revokeSessionsByUserId.mockResolvedValue(undefined);
      cacheService.deleteKeysBySuffix.mockResolvedValue(0);

      // Act
      const result = await service.logoutAll(mockAuthPayload);

      // Assert
      expect(usersService.revokeSessionsByUserId).toHaveBeenCalledWith(
        mockAuthPayload.uid,
      );
      expect(cacheService.deleteKeysBySuffix).toHaveBeenCalledWith(
        `auth:user:${mockAuthPayload.uid}:*`,
      );
      expect(result).toHaveProperty(
        'messageKey',
        'user.LOGOUT_ALL_DEVICES_SUCCESS',
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      // Arrange
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      usersService.findById.mockResolvedValue(mockUser as User);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('hashedNewPassword' as never);
      usersService.updateUser.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.updatePassword(
        mockAuthPayload,
        updatePasswordDto,
      );

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith(mockAuthPayload.uid);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        updatePasswordDto.currentPassword,
        mockUser.password,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        updatePasswordDto.newPassword,
        10,
      );
      expect(usersService.updateUser).toHaveBeenCalledWith(
        mockAuthPayload.uid,
        {
          password: 'hashedNewPassword',
        },
      );
      expect(result).toHaveProperty(
        'messageKey',
        'user.PASSWORD_UPDATED_SUCCESS',
      );
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      usersService.findById.mockResolvedValue(null as any);

      // Act & Assert
      await expect(
        service.updatePassword(mockAuthPayload, updatePasswordDto),
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when current password is invalid', async () => {
      // Arrange
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      usersService.findById.mockResolvedValue(mockUser as User);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        service.updatePassword(mockAuthPayload, updatePasswordDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      // Arrange
      const mockAccessToken = 'new-access-token-123';
      usersService.findSessionById.mockResolvedValue(mockSession as any);
      usersService.findById.mockResolvedValue(mockUser as User);
      jwtService.signAsync.mockResolvedValue(mockAccessToken);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.refreshToken(mockAuthPayload);

      // Assert
      expect(usersService.findSessionById).toHaveBeenCalledWith(
        mockAuthPayload.ssid,
      );
      expect(usersService.findById).toHaveBeenCalledWith(mockSession.userId);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          uid: mockSession.userId,
          ssid: mockSession.id,
          role: mockUser.role,
        },
        {
          expiresIn: 3600, // 1 hour in seconds
          algorithm: 'HS256',
        },
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        `auth:user:${mockSession.userId}:accessToken:${mockSession.id}`,
        mockAccessToken,
        3600,
      );
      expect(result).toHaveProperty(
        'messageKey',
        'user.ACCESS_TOKEN_REFRESHED_SUCCESS',
      );
      expect(result.data).toHaveProperty('accessToken', mockAccessToken);
    });

    it('should throw error when session not found', async () => {
      // Arrange
      usersService.findSessionById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(mockAuthPayload)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw error when session is expired', async () => {
      // Arrange
      const expiredSession = {
        ...mockSession,
        isExpired: () => true,
      };
      usersService.findSessionById.mockResolvedValue(expiredSession as any);

      // Act & Assert
      await expect(service.refreshToken(mockAuthPayload)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw error when session is invalid', async () => {
      // Arrange
      const invalidSession = {
        ...mockSession,
        isValid: () => false,
      };
      usersService.findSessionById.mockResolvedValue(invalidSession as any);

      // Act & Assert
      await expect(service.refreshToken(mockAuthPayload)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('createDeviceToken', () => {
    it('should create device token successfully', async () => {
      // Arrange
      const createDeviceTokenDto: CreateDeviceTokenDto = {
        token: 'device-token-123',
        deviceId: 'device-123',
        deviceType: 'mobile',
        provider: 'fcm',
      };

      const mockDeviceToken = {
        id: 'device-token-123',
        token: 'device-token-123',
        deviceType: 'mobile',
        deviceName: 'iPhone 12',
      };

      usersService.createDeviceToken.mockResolvedValue(mockDeviceToken as any);

      // Act
      const result = await service.createDeviceToken(
        createDeviceTokenDto,
        mockAuthPayload,
      );

      // Assert
      expect(usersService.createDeviceToken).toHaveBeenCalledWith(
        createDeviceTokenDto,
        mockAuthPayload,
      );
      expect(result).toEqual(mockDeviceToken);
    });
  });

  describe('getSessions', () => {
    it('should get user sessions with pagination', async () => {
      // Arrange
      const paginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'DESC' as const,
      };

      const mockSessions = {
        result: [mockSession],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      usersService.findSessionsByUserId.mockResolvedValue(mockSessions as any);

      // Act
      const result = await service.getSessions(paginationDto);

      // Assert
      expect(usersService.findSessionsByUserId).toHaveBeenCalledWith(
        paginationDto,
      );
      expect(result).toEqual(mockSessions);
    });
  });

  describe('getSessionsCursor', () => {
    it('should get user sessions with cursor pagination', async () => {
      // Arrange
      const paginationDto = {
        page: 1,
        limit: 10,
        cursor: 'cursor-123',
        sortBy: 'createdAt',
        order: 'DESC' as const,
      };

      const mockSessions = {
        result: [mockSession],
        metaData: {
          nextCursor: 'next-cursor-123',
          prevCursor: null,
          take: 10,
          sortBy: 'createdAt',
          order: 'DESC' as const,
        },
      };

      usersService.findSessionsByUserIdCursor.mockResolvedValue(
        mockSessions as any,
      );

      // Act
      const result = await service.getSessionsCursor(paginationDto);

      // Assert
      expect(usersService.findSessionsByUserIdCursor).toHaveBeenCalledWith(
        paginationDto,
      );
      expect(result).toEqual(mockSessions);
    });
  });

  describe('getSessionById', () => {
    it('should get session by ID', async () => {
      // Arrange
      const sessionId = 'session-123';
      usersService.findSessionById.mockResolvedValue(mockSession as any);

      // Act
      const result = await service.getSessionById(sessionId);

      // Assert
      expect(usersService.findSessionById).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(mockSession);
    });
  });

  describe('requestOtp', () => {
    it('should request OTP for existing user successfully', async () => {
      // Arrange
      const otpRequestDto: OtpRequestDto = {
        email: 'test@example.com',
      };

      usersService.findByEmail.mockResolvedValue(mockUser as User);
      otpStore.set.mockResolvedValue(undefined);
      emailOtpSender.sendOtp.mockResolvedValue(undefined);

      // Act
      const result = await service.requestOtp(otpRequestDto);

      // Assert
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        otpRequestDto.email,
      );
      expect(otpStore.set).toHaveBeenCalledWith(
        `otp:login:${otpRequestDto.email.toLowerCase()}`,
        expect.objectContaining({
          code: expect.any(String),
          email: otpRequestDto.email.toLowerCase(),
          createdAt: expect.any(Number),
          expiresAt: expect.any(Number),
          attempts: 0,
          maxAttempts: 5,
          isUsed: false,
          requestId: expect.any(String),
        }),
        300, // 5 minutes TTL
      );
      expect(emailOtpSender.sendOtp).toHaveBeenCalledWith(
        otpRequestDto.email,
        expect.any(String),
        expect.any(String),
      );
      expect(result).toHaveProperty('messageKey', 'auth.OTP_SENT_SUCCESS');
      expect(result.data).toHaveProperty('requestId');
      expect(result.data).toHaveProperty('expiresInSec', 300);
    });

    it('should request OTP for non-existing user (security)', async () => {
      // Arrange
      const otpRequestDto: OtpRequestDto = {
        email: 'nonexistent@example.com',
      };

      usersService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await service.requestOtp(otpRequestDto);

      // Assert
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        otpRequestDto.email,
      );
      expect(otpStore.set).not.toHaveBeenCalled();
      expect(emailOtpSender.sendOtp).not.toHaveBeenCalled();
      expect(result).toHaveProperty('messageKey', 'auth.OTP_SENT_SUCCESS');
      expect(result.data).toHaveProperty('requestId');
      expect(result.data).toHaveProperty('expiresInSec', 300);
    });

    it('should handle OTP request errors', async () => {
      // Arrange
      const otpRequestDto: OtpRequestDto = {
        email: 'test@example.com',
      };

      usersService.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.requestOtp(otpRequestDto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '123456',
        requestId: 'req-123',
      };

      otpStore.get.mockResolvedValue(mockOtpData);
      otpStore.markAsUsed.mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.verifyOtp(otpVerifyDto, mockClientInfo);

      // Assert
      expect(otpStore.get).toHaveBeenCalledWith(
        `otp:login:${otpVerifyDto.email.toLowerCase()}`,
      );
      expect(otpStore.markAsUsed).toHaveBeenCalledWith(
        `otp:login:${otpVerifyDto.email.toLowerCase()}`,
      );
      expect(usersService.findByEmail).toHaveBeenCalledWith(otpVerifyDto.email);
      expect(result).toHaveProperty('messageKey', 'auth.OTP_LOGIN_SUCCESS');
      expect(result.data).toHaveProperty('user', mockUser);
      expect(result.data).toHaveProperty('token');
    });

    it('should throw error when OTP not found', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '123456',
        requestId: 'req-123',
      };

      otpStore.get.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.verifyOtp(otpVerifyDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when OTP is already used', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '123456',
        requestId: 'req-123',
      };

      const usedOtpData = { ...mockOtpData, isUsed: true };
      otpStore.get.mockResolvedValue(usedOtpData);

      // Act & Assert
      await expect(
        service.verifyOtp(otpVerifyDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when OTP is expired', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '123456',
        requestId: 'req-123',
      };

      const expiredOtpData = {
        ...mockOtpData,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };
      otpStore.get.mockResolvedValue(expiredOtpData);
      otpStore.delete.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        service.verifyOtp(otpVerifyDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
      expect(otpStore.delete).toHaveBeenCalledWith(
        `otp:login:${otpVerifyDto.email.toLowerCase()}`,
      );
    });

    it('should throw error when max attempts exceeded', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '123456',
        requestId: 'req-123',
      };

      const maxAttemptsOtpData = {
        ...mockOtpData,
        attempts: 5, // Max attempts reached
      };
      otpStore.get.mockResolvedValue(maxAttemptsOtpData);
      otpStore.delete.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        service.verifyOtp(otpVerifyDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
      expect(otpStore.delete).toHaveBeenCalledWith(
        `otp:login:${otpVerifyDto.email.toLowerCase()}`,
      );
    });

    it('should throw error when OTP code is invalid', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '654321', // Wrong code
        requestId: 'req-123',
      };

      otpStore.get.mockResolvedValue(mockOtpData);
      otpStore.incrementAttempts.mockResolvedValue({
        ...mockOtpData,
        attempts: 1,
      });

      // Act & Assert
      await expect(
        service.verifyOtp(otpVerifyDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
      expect(otpStore.incrementAttempts).toHaveBeenCalledWith(
        `otp:login:${otpVerifyDto.email.toLowerCase()}`,
      );
    });

    it('should throw error when user not found after OTP verification', async () => {
      // Arrange
      const otpVerifyDto: OtpVerifyDto = {
        email: 'test@example.com',
        code: '123456',
        requestId: 'req-123',
      };

      otpStore.get.mockResolvedValue(mockOtpData);
      otpStore.markAsUsed.mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.verifyOtp(otpVerifyDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('firebaseLogin', () => {
    it('should login with Firebase successfully for existing user', async () => {
      // Arrange
      const firebaseLoginDto: FirebaseLoginDto = {
        idToken: 'firebase-id-token-123',
      };

      firebaseService.authenticate.mockResolvedValue({
        success: true,
        user: mockFirebaseUser,
      });
      usersService.findByFirebaseUid.mockResolvedValue(mockUser as User);
      usersService.updateUser.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.firebaseLogin(
        firebaseLoginDto,
        mockClientInfo,
      );

      // Assert
      expect(firebaseService.authenticate).toHaveBeenCalledWith(
        firebaseLoginDto.idToken,
      );
      expect(usersService.findByFirebaseUid).toHaveBeenCalledWith(
        mockFirebaseUser.uid,
      );
      expect(usersService.updateUser).toHaveBeenCalledWith(mockUser.id, {
        isEmailVerified: mockFirebaseUser.email_verified,
        photoUrl: mockFirebaseUser.picture,
      });
      expect(result).toHaveProperty(
        'messageKey',
        'auth.FIREBASE_LOGIN_SUCCESS',
      );
      expect(result.data).toHaveProperty('user', mockUser);
      expect(result.data).toHaveProperty('token');
    });

    it('should create new user for Firebase login', async () => {
      // Arrange
      const firebaseLoginDto: FirebaseLoginDto = {
        idToken: 'firebase-id-token-123',
      };

      const newUser = { ...mockUser, firebaseUid: mockFirebaseUser.uid };

      firebaseService.authenticate.mockResolvedValue({
        success: true,
        user: mockFirebaseUser,
      });
      usersService.findByFirebaseUid.mockResolvedValue(null);
      usersService.createFromFirebase.mockResolvedValue(newUser as User);

      // Act
      const result = await service.firebaseLogin(
        firebaseLoginDto,
        mockClientInfo,
      );

      // Assert
      expect(firebaseService.authenticate).toHaveBeenCalledWith(
        firebaseLoginDto.idToken,
      );
      expect(usersService.findByFirebaseUid).toHaveBeenCalledWith(
        mockFirebaseUser.uid,
      );
      expect(usersService.createFromFirebase).toHaveBeenCalledWith({
        firebaseUid: mockFirebaseUser.uid,
        email: mockFirebaseUser.email,
        name: mockFirebaseUser.name,
        emailVerified: mockFirebaseUser.email_verified,
        photoUrl: mockFirebaseUser.picture,
        oauthId: mockFirebaseUser.uid,
        oauthProvider: mockFirebaseUser.firebase.sign_in_provider,
      });
      expect(result).toHaveProperty(
        'messageKey',
        'auth.FIREBASE_LOGIN_SUCCESS',
      );
      expect(result.data).toHaveProperty('user', newUser);
      expect(result.data).toHaveProperty('token');
    });

    it('should throw error when Firebase authentication fails', async () => {
      // Arrange
      const firebaseLoginDto: FirebaseLoginDto = {
        idToken: 'invalid-token',
      };

      firebaseService.authenticate.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      // Act & Assert
      await expect(
        service.firebaseLogin(firebaseLoginDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
    });

    it('should handle Firebase authentication errors', async () => {
      // Arrange
      const firebaseLoginDto: FirebaseLoginDto = {
        idToken: 'firebase-id-token-123',
      };

      firebaseService.authenticate.mockRejectedValue(
        new Error('Firebase error'),
      );

      // Act & Assert
      await expect(
        service.firebaseLogin(firebaseLoginDto, mockClientInfo),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getOtpStoreKey', () => {
    it('should generate correct OTP store key', () => {
      // Arrange
      const email = 'Test@Example.COM';

      // Act
      const result = (service as any).getOtpStoreKey(email);

      // Assert
      expect(result).toBe('otp:login:test@example.com');
    });
  });
});
