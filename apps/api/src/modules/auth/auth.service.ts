import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { RegisterDto, LoginDto } from './dto';
import type {
  AuthResponse,
  TokenPair,
  JwtPayload,
  UserProfile,
} from '@signal-sandbox/shared-types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.authRepo.findUserByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const { user, organisation } = await this.authRepo.createUserWithOrg({
      email: dto.email,
      name: dto.name,
      passwordHash,
      organisationName: dto.organisationName || `${dto.name}'s Workspace`,
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      orgId: organisation.id,
      role: 'owner',
    });

    await this.authRepo.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organisationId: organisation.id,
        role: 'owner',
        createdAt: user.created_at,
      },
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      orgId: user.org_id,
      role: user.role,
    });

    await this.authRepo.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organisationId: user.org_id,
        role: user.role,
        createdAt: user.created_at,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
      });

      const stored = await this.authRepo.findRefreshToken(payload.sub, refreshToken);
      if (!stored) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.authRepo.findUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        orgId: user.org_id,
        role: user.role,
      });

      await this.authRepo.deleteRefreshToken(refreshToken);
      await this.authRepo.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.authRepo.deleteAllRefreshTokens(userId);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organisationId: user.org_id,
      role: user.role,
      createdAt: user.created_at,
    };
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
