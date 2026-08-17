/**
 * @jest-environment node
 */

import { resolveBulkFolderId, folderNamesToEnsure } from "@/lib/bulk-folder-target";

const IDS = { Jiujitsu: "f_jiu", Swimmers: "f_swim", "Tennis Elbow": "f_new" };

describe("adding videos to a folder that already exists", () => {
  it("files them in the picked folder", () => {
    expect(resolveBulkFolderId({
      pickedFolderId: "f_jiu", folderNameToId: {},
    })).toBe("f_jiu");
  });

  it("creates nothing when a folder was picked", () => {
    const files = [{ folder: null }, { folder: null }, { folder: undefined }];
    expect(folderNamesToEnsure(files, "f_jiu", "")).toEqual([]);
  });

  it("ignores a leftover typed name once a folder is picked", () => {
    expect(resolveBulkFolderId({
      pickedFolderId: "f_jiu", fallbackFolderName: "Tennis Elbow", folderNameToId: IDS,
    })).toBe("f_jiu");
  });
});

describe("creating a new folder instead", () => {
  it("uses the id resolved for the typed name", () => {
    expect(resolveBulkFolderId({
      pickedFolderId: null, fallbackFolderName: "Tennis Elbow", folderNameToId: IDS,
    })).toBe("f_new");
  });

  it("asks for that one name to be created", () => {
    const files = [{ folder: null }, { folder: null }];
    expect(folderNamesToEnsure(files, null, "Tennis Elbow")).toEqual(["Tennis Elbow"]);
  });

  it("trims what was typed", () => {
    expect(resolveBulkFolderId({
      fallbackFolderName: "  Jiujitsu  ", folderNameToId: IDS,
    })).toBe("f_jiu");
  });
});

describe("a dragged-in folder keeps its own name", () => {
  it("wins over a picked folder", () => {
    expect(resolveBulkFolderId({
      fileFolder: "Swimmers", pickedFolderId: "f_jiu", folderNameToId: IDS,
    })).toBe("f_swim");
  });

  it("still needs its name created, even alongside a picked folder", () => {
    const files = [{ folder: "Swimmers" }, { folder: null }];
    expect(folderNamesToEnsure(files, "f_jiu", "")).toEqual(["Swimmers"]);
  });

  it("does not repeat a name shared by several files", () => {
    const files = [{ folder: "Swimmers" }, { folder: "Swimmers" }, { folder: "Jiujitsu" }];
    expect(folderNamesToEnsure(files, null, "")).toEqual(["Swimmers", "Jiujitsu"]);
  });
});

describe("nothing is filed into limbo", () => {
  it("returns null with no folder, no pick and no name", () => {
    expect(resolveBulkFolderId({ folderNameToId: {} })).toBeNull();
  });

  it("returns null when a name was never resolved to an id", () => {
    expect(resolveBulkFolderId({
      fallbackFolderName: "Never Created", folderNameToId: IDS,
    })).toBeNull();
  });

  it("returns null when a dragged folder's name was never resolved", () => {
    expect(resolveBulkFolderId({
      fileFolder: "Unknown", pickedFolderId: "f_jiu", folderNameToId: IDS,
    })).toBeNull();
  });

  it("treats a whitespace-only name as no name", () => {
    expect(resolveBulkFolderId({ fallbackFolderName: "   ", folderNameToId: IDS })).toBeNull();
    expect(folderNamesToEnsure([{ folder: null }], null, "   ")).toEqual([]);
  });
});
