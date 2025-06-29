export class SignupDto {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  specialization?: string; // Optional for patients
  phone_number?: string;
  gender?: string;
  dob?: Date;
  patient_address?: string;
  emergency_contact?: string;
  role: 'doctor' | 'patient'; // Specify role as either doctor or patient

  education?: string; // Optional for doctors
  experience?: number; // Optional for doctors
  clinic_name?: string; // Optional for doctors
  clinic_address?: string; // Optional for doctors
  available_days?: string; // Optional for doctors
  available_time_slots?: string; // Optional for doctors
}
