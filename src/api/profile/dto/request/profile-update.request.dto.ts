import { ProfileEmployeeRequestDto } from "@api/profile/dto/request/profile-employee.request.dto";
import { ProfilePartnerRequestDto } from "@api/profile/dto/request/profile-partner.request.dto";

export type ProfileUpdateRequestDto = ProfilePartnerRequestDto & ProfileEmployeeRequestDto