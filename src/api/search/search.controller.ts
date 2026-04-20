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
  async search(
    @AuthUser() authUser: any,
    @Query("q") q: string,
    @Query("limit") limit?: string,
  ) {
    if (!q || q.trim().length < 2) {
      return { deals: [], configurations: [], documents: [], news: [] };
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    return this.searchService.search(
      authUser,
      q.trim(),
      Math.min(parsedLimit, 20),
    );
  }
}
