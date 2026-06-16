import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "@decorators/auth-user";
import { SearchService } from "./search.service";

@ApiTags("search")
@ApiBearerAuth()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiQuery({ name: "q", required: true, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "page", required: false, type: Number })
  async search(
    @AuthUser() authUser: any,
    @Query("q") q: string,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedPage = page ? parseInt(page, 10) : 1;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 10;
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(parsedPage, 1)
      : 1;

    if (!q || q.trim().length < 3) {
      return {
        deals: [],
        configurations: [],
        documents: [],
        news: [],
        similar: [],
        meta: {
          page: safePage,
          limit: safeLimit,
          total: 0,
          totalPages: 0,
          totals: {
            deals: 0,
            configurations: 0,
            documents: 0,
            news: 0,
          },
        },
      };
    }

    return this.searchService.search(authUser, q.trim(), safeLimit, safePage);
  }
}
