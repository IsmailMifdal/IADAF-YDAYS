export interface Document {
  id: number;
  nom: string;
  type: string;
  taille: number;
  url: string;
  dateUpload: string;
  userId?: number;
  demarcheId?: number;
}

export interface UploadDocumentDto {
  file: File;
  demarcheId?: number;
}
