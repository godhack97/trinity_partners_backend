import { UploadFileController } from "./upload-file.controller";

describe("UploadFileController", () => {
  it("returns a portable public path instead of an incomplete hostname", () => {
    const controller = new UploadFileController();
    const result = controller.uploadPdfFile({
      filename: "server-front.webp",
    } as Express.Multer.File);

    expect(result).toEqual({
      configuration_link: "/public/files/server-front.webp",
    });
  });
});
