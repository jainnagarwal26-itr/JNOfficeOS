/**
 * @legacy
 * ARCHIVED / DECOMMISSIONED MODULE
 * 
 * Google Sheets & Google Apps Script are completely decommissioned from JN OfficeOS.
 * Supabase PostgreSQL is the ONLY authoritative production Source of Truth.
 */

export interface IGoogleSheetsService {
  isActiveSyncEnabled(): boolean;
  pullAllFromSheets(): Promise<{ success: boolean; message: string }>;
  bulkSync(table: string, idKey: string, records: any[]): Promise<boolean>;
  pushRecord(table: string, idKey: string, idValue: string, data: any): Promise<boolean>;
  deleteRecord(table: string, idKey: string, idValue: string): Promise<boolean>;
}

class GoogleSheetsDecommissionedStub implements IGoogleSheetsService {
  public isActiveSyncEnabled(): boolean {
    return false;
  }
  public async pullAllFromSheets(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: "Google Sheets is decommissioned. Authoritative data is managed via Supabase PostgreSQL." };
  }
  public async bulkSync(): Promise<boolean> {
    return false;
  }
  public async pushRecord(): Promise<boolean> {
    return false;
  }
  public async deleteRecord(): Promise<boolean> {
    return false;
  }
}

export const googleSheetsService: IGoogleSheetsService = new GoogleSheetsDecommissionedStub();
export function cleanPhoneNumberFromSheets(val: any): string {
  return String(val || "");
}
