/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { AdminAuditAction } from '@/audit-logs/enums/admin-audit-action.enum';
import { CustomerAuditAction } from '@/audit-logs/enums/customer-audit-action.enum';

/** Thông tin ngữ cảnh trích xuất từ request gốc */
export interface AuditRequestContext {
  ip: string | null;
  userAgent: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  body: Record<string, unknown>;
  params: Record<string, string>;
}

export class AuditContextHelper {
  /**
   * Trích xuất toàn bộ thông tin cần thiết từ request NestJS
   * để sử dụng trong quá trình ghi log.
   */
  static extractFromRequest(req: any): AuditRequestContext {
    const user = req.user;
    return {
      ip: req.ip ?? null,
      userAgent: req.headers?.['user-agent'] ?? null,
      userId: user?.id ?? null,
      userName: user?.fullName ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
      body: req.body ?? {},
      params: req.params ?? {},
    };
  }

  /**
   * Resolve action động từ decorator tag (ví dụ: UPDATE_USER_STATUS → LOCK_USER / UNLOCK_USER)
   * dựa trên giá trị `status` trong request body.
   */
  static resolveDynamicAdminAction(
    tag: AdminAuditAction | 'UPDATE_USER_STATUS' | 'UPDATE_ACCOUNT_STATUS',
    body: Record<string, unknown>,
  ): AdminAuditAction {
    if (tag === 'UPDATE_USER_STATUS') {
      return body['status'] === 'locked' ? AdminAuditAction.LOCK_USER : AdminAuditAction.UNLOCK_USER;
    }
    if (tag === 'UPDATE_ACCOUNT_STATUS') {
      return body['status'] === 'locked' ? AdminAuditAction.FREEZE_ACCOUNT : AdminAuditAction.UNFREEZE_ACCOUNT;
    }
    // tag is an AdminAuditAction at this point, since the two special string cases are handled above
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return tag as AdminAuditAction;
  }

  /**
   * Với action tài chính (transfer/deposit/withdraw), trả về ID của transaction từ response
   * để liên kết audit log với bảng transactions thay vì lưu trùng lặp thông tin giao dịch.
   */
  static extractTransactionId(action: CustomerAuditAction, responseData: any): string | null {
    const financialActions: CustomerAuditAction[] = [
      CustomerAuditAction.TRANSFER,
      CustomerAuditAction.DEPOSIT,
      CustomerAuditAction.WITHDRAW,
    ];
    return financialActions.includes(action) ? (responseData?.id ?? null) : null;
  }
}
