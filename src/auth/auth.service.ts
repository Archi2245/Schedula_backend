import {
<<<<<<< HEAD
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignupDto } from 'src/dto/signup.dto';
import { Doctor } from 'src/entities/doctor.entity';
import * as bcrypt from 'bcrypt';
import { SigninDto } from 'src/dto/signin.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshDto } from 'src/dto/refresh.dto';
import { User } from 'src/entities/user.entity';
import { Patient } from 'src/entities/patient.entity';
=======
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

>>>>>>> main

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
<<<<<<< HEAD
    private userRepository: Repository<User>,

    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private jwtService: JwtService,
  ) {}

  async Signup(signupdto: SignupDto) {
    //checking if email already exists
    const exists = await this.userRepository.findOne({
      where: { email: signupdto.email },
    });

    if (exists) {
      throw new ConflictException(`Email ${signupdto.email} already exists`);
    }
    try {
      // hashing the password
      const hashed_pass = await bcrypt.hash(signupdto.password as any, 10);

      //creating a new user entity
      const user = this.userRepository.create({
        email: signupdto.email,
        role: signupdto.role,
        password: hashed_pass,
      });

      // saving the user entity to the database
      const userSaved = await this.userRepository.save(user);

      // if the user is a doctor, create a doctor entity
      if (signupdto.role === 'doctor') {
        const doctor = this.doctorRepository.create({
          user: userSaved,
          first_name: signupdto.first_name,
          last_name: signupdto.last_name,
          specialization: signupdto.specialization,
          phoneNumber: signupdto.phone_number,
          education: signupdto.education,
          experience_years: signupdto.experience,
          clinic_name: signupdto.clinic_name,
          clinic_address: signupdto.clinic_address,
        });
        await this.doctorRepository.save(doctor);
      } else if (signupdto.role === 'patient') {
        // If the user is a patient
        const patient = this.patientRepository.create({
          user: userSaved,
          first_name: signupdto.first_name,
          last_name: signupdto.last_name,
          phone_number: signupdto.phone_number,
          dob: signupdto.dob,
          patient_address: signupdto.patient_address,
          gender: signupdto.gender,
          emergency_contact: signupdto.emergency_contact,
        });
        await this.patientRepository.save(patient);
      }
      // if everything is fine, return a success message
      console.log(
        `User ${signupdto.email} signed up with role: ${signupdto.role}`,
      );
      return { message: 'Signup successful' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error during signup: ${error.message}`,
      );
    }
  }

  async Signin(dto: SigninDto) {
    // checking if email exists in db

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new ConflictException(`Email ${dto.email} does not exist`);
    }

    if (user.provider !== 'local') {
      throw new UnauthorizedException(
        'Please use Google login for this account',
      );
    }

    // checking if password is correct
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password as any,
    );
    if (!isPasswordValid) {
      throw new ConflictException('Invalid password');
    }

    // if everything is fine, generate JWT tokens

    const [access_token, refresh_token] = await this.generateTokens(
      user.user_id,
      user.email,
      user.role,
    );

    // save the refresh token in the database
    user.hashed_refresh_token = await bcrypt.hash(refresh_token, 10);
    await this.userRepository.save(user);

    // if everything is fine, return the doctor entity
    console.log(`User ${user.email} signed in with role: ${user.role}`);

    return {
      message: 'Signin successful',
      role: user.role,
      access_token: access_token,
      refresh_token: refresh_token,
    };
  }
  // generate access and refresh tokens
  private async generateTokens(userid: number, email: string, role: string) {
    const payload = { sub: userid, email, role: role };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });
    return [access_token, refresh_token];
  }

  async signOut(token: string) {
    const payload = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
    const user = await this.userRepository.findOne({
      where: { user_id: payload['sub'] },
    });
    if (!user) {
      throw new ConflictException(`User does not exist`);
    }

    // Clear the hashed refresh token
    user.hashed_refresh_token = null;

    await this.userRepository.save(user);
    console.log('Signing out User :', user.email);

    return { message: 'Sign out successful' };
  }

  async refresh(dto: RefreshDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.userRepository.findOne({
        where: { user_id: payload.sub },
      });
      if (!user || !user.hashed_refresh_token) {
        throw new UnauthorizedException(`'Refresh token is invalid`);
      }

      const compare_refresh_token = await bcrypt.compare(
        dto.refresh_token,
        user.hashed_refresh_token,
      );
      if (!compare_refresh_token) {
        throw new UnauthorizedException(`Refresh token is expired`);
      }

      const [access_token, refresh_token] = await this.generateTokens(
        user.user_id,
        user.email,
        user.role,
      );

      // Save the new refresh token in the database
      user.hashed_refresh_token = await bcrypt.hash(refresh_token, 10);
      await this.userRepository.save(user);
      return {
        message: 'Token refreshed successfully',
        access_token: access_token,
        refresh_token: refresh_token,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error during token refresh: ${error.message}`,
      );
    }
  }

  async google_login(profile: any) {
    const { email, name, role } = profile;

    // Check if user already exists
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['doctor', 'patient'],
    });

    // If user exists but is local, reject
    if (user && user.provider !== 'google') {
      throw new UnauthorizedException(
        'Account exists with email/password. Please use local login.',
      );
    }

    // If user exists but role mismatch
    if (user?.role && user.role !== role) {
      throw new UnauthorizedException(
        'Role mismatch. Please use the correct login method.',
      );
    }

    // If user doesn't exist → create user
    if (!user) {
      user = this.userRepository.create({
        email,
        provider: 'google',
        role,
        password: null,
      });
      user = await this.userRepository.save(user);

      // Create role-specific profile
      if (role === 'doctor') {
        const doctor = this.doctorRepository.create({
          user,
          first_name: name.split(' ')[0],
          last_name: name.split(' ')[1] || '',
        });
        await this.doctorRepository.save(doctor);
      } else if (role === 'patient') {
        const patient = this.patientRepository.create({
          user,
          first_name: name.split(' ')[0],
          last_name: name.split(' ')[1] || '',
        });
        await this.patientRepository.save(patient);
      }
    }

    // Generate tokens
    const payload = { sub: user.user_id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // Save hashed refresh token
    user.hashed_refresh_token = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.save(user);

    console.log(`User ${user.email} logged in with role: ${user.role}`);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      role: user.role,
    };
  }
=======
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
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
    });

    const savedUser = await this.userRepo.save(user);

    // Based on Role, create profile
    if (dto.role === Role.DOCTOR) {
      const doctor = this.doctorRepo.create({
        name: dto.name,
        specialization: dto.specialization,
        user: savedUser,
        phone_number: dto.phone_number,
        experience_years: dto.experience_years,
        education: dto.education,
        clinic_name: dto.clinic_name,
        clinic_address: dto.clinic_address,
        available_days: dto.available_days,
        available_time_slots: dto.available_time_slots,
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


  

>>>>>>> main
}
