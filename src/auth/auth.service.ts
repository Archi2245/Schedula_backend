import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { Role } from '../types/roles.enum';
import { UnauthorizedException } from '@nestjs/common';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ForbiddenException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create User (common for both roles)
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      provider: 'local',
    });

    const savedUser = await this.userRepo.save(user);

    // Based on Role, create profile
    if (dto.role === Role.DOCTOR) {
      const doctor = this.doctorRepo.create({
        specialization: dto.specialization,
        user: savedUser, // `savedUser` should contain `name`, `email`, etc.
        phone_number: dto.phone_number,
        experience_years: dto.experience_years,
        education: dto.education,
        clinic_name: dto.clinic_name,
        clinic_address: dto.clinic_address,
      });
      await this.doctorRepo.save(doctor);
    } else if (dto.role === Role.PATIENT) {
      const patient = this.patientRepo.create({
        first_name: dto.first_name,
        last_name: dto.last_name,
        gender: dto.gender,
        dob: dto.dob,
        phone_number: dto.phone_number,
        address: dto.address,
        emergency_contact: dto.emergency_contact,
        medical_history: dto.medical_history,
        user: savedUser,
      });
      await this.patientRepo.save(patient);
    } else {
      throw new BadRequestException('Invalid role');
    }

    const tokens = await this.getTokens(savedUser.id, savedUser.email, savedUser.role);
    await this.updateRefreshToken(savedUser.id, tokens.refresh_token);
    return tokens;
  }

  async signin(dto: SigninDto) {
  const user = await this.userRepo.findOne({ where: { email: dto.email } });
  if (!user) throw new ForbiddenException('User not found');

  // 🔐 Prevent mixed login
  if (user.provider === 'google') {
    throw new ForbiddenException(
      'Account is registered via Google. Please login with Google.',
    );
  }

  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new ForbiddenException('Invalid credentials');

  const tokens = await this.getTokens(user.id, user.email, user.role);
  await this.updateRefreshToken(user.id, tokens.refresh_token);

  return tokens;
}


  async signout(userId: number) {
    await this.userRepo.update(userId, { hashedRefreshToken: null });
    return { message: 'Signed out successfully' };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.hashedRefreshToken)
      throw new ForbiddenException('Access Denied');

    const match = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!match) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  async updateRefreshToken(userId: number, token: string) {
    const hash = await bcrypt.hash(token, 10);
    await this.userRepo.update(userId, { hashedRefreshToken: hash });
  }

  async getTokens(userId: number, email: string, role: Role) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRY,
        }
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRY,
        }
      ),
    ]);

    return { access_token, refresh_token };
  }

  async handleGoogleLogin(profile: any) {
  const existingUser = await this.userRepo.findOne({ where: { email: profile.email } });

  if (existingUser && existingUser.provider === 'local') {
    throw new UnauthorizedException(
      'Account registered via email/password. Please login with password.',
    );
  }

  let user = existingUser;
  if (!user) {
    user = this.userRepo.create({
      email: profile.email,
      provider: 'google',
      role: profile.role,
      password: '', // Avoid null if your DB doesn't allow null
    });
    await this.userRepo.save(user);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = await this.jwtService.signAsync(payload);
  return { access_token };
}


  

}
