import { Injectable } from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { UserRepository, CompanyRepository } from "@orm/repositories";

@Injectable()
export class DashboardService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async getSummary(authUser: UserEntity) {
    // Load user with manager and user_info relations
    const user = await this.userRepository.findByIdWithUserInfo(authUser.id);

    // Get company info
    const company = await this.companyRepository.findByOwnerId(authUser.id);

    // Build partner info
    const partner = {
      status: company?.partner_level || null,
      status_label: this.getPartnerLabel(company?.partner_level),
      certificate_expiry: company?.certificate_expiry
        ? company.certificate_expiry.toISOString().split("T")[0]
        : null,
      company_name: company?.name || user?.user_info?.company_name || null,
    };

    // Build personal manager info
    let personalManager = null;
    if (user?.manager) {
      const manager = await this.userRepository.findByIdWithUserInfo(
        user.manager.id,
      );
      if (manager?.user_info) {
        personalManager = {
          id: manager.id,
          first_name: manager.user_info.first_name,
          last_name: manager.user_info.last_name,
          phone: manager.user_info.phone,
          email: manager.email,
          photo_url: manager.user_info.photo_url || null,
        };
      }
    }

    return {
      partner,
      personal_manager: personalManager,
    };
  }

  private getPartnerLabel(level?: string): string {
    if (!level) return "—";
    const labels: Record<string, string> = {
      bronze: "Бронзовый партнёр",
      silver: "Серебряный партнёр",
      gold: "Золотой партнёр",
      platinum: "Платиновый партнёр",
    };
    return labels[level] || level;
  }
}
