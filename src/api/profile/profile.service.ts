import { ProfileEmployeeRequestDto } from "@api/profile/dto/request/profile-employee.request.dto";
import { ProfilePartnerRequestDto } from "@api/profile/dto/request/profile-partner.request.dto";
import { ProfileUpdateRequestDto } from "@api/profile/dto/request/profile-update.request.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import {
    HttpException,
    Injectable
} from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import {
    CompanyEmployeeRepository,
    CompanyRepository,
    RoleRepository,
    UserInfoRepository,
    UserRepository
} from "@orm/repositories";

@Injectable()
export class ProfileService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly userInfoRepository: UserInfoRepository,
        private readonly companyRepository: CompanyRepository,
    ) {}
    async update(auth_user: Partial<UserEntity>, data: ProfileUpdateRequestDto) {
        const user = await this.userRepository.findById(auth_user.id);

        if(user.role.name === RoleTypes.Partner) {
            return this.updatePartner(user, data);
        }

        if(user.role.name === RoleTypes.Employee) {
            return this.updateEmployee(user, data);
        }
    }

    private async updateEmployee(user: UserEntity, data: ProfileEmployeeRequestDto) {
        await this.userInfoRepository.update(user.info.id, {
            job_title: data.job_title,
            phone: data.phone,
            photo_url: data.photo_url,
        });
    }
    private async updatePartner(user: UserEntity, data: ProfilePartnerRequestDto) {
        await this.userInfoRepository.update(user.info.id, {
            job_title: data.job_title,
            phone: data.phone,
            photo_url: data.photo_url,
        });
        const company = await this.companyRepository.findOneBy({ owner_id:user.id })
        await this.companyRepository.update(company.id, {
            company_business_line: data.company_business_line,
            employees_count: data.employees_count,
            site_url: data.site_url,
            promoted_products: data.promoted_products,
            products_of_interest: data.products_of_interest,
            main_customers: data.main_customers,
        });
    }

}