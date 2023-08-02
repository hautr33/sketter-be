export enum Roles {
    'Admin' = 1,
    'Manager',
    'Supplier',
    'Traveler',
}

export enum PersonalityTypes {
    'Thích khám phá' = 1,
    'Ưa mạo hiểm',
    'Tìm kiếm sự thư giãn',
    'Đam mê với ẩm thực',
    'Đam mê với lịch sử, văn hóa',
    'Yêu thiên nhiên',
    'Giá rẻ là trên hết',
    'Có nhu cầu vui chơi, giải trí cao'
}

export class Catalogs {
    public static readonly stay = 'Lưu trú';
    public static readonly food = 'Ẩm thực';
    public static readonly exploration = 'Khám phá';
    public static readonly culture = 'Văn hóa';
}

export class Gender {
    public static readonly female = 'Nam';

    public static readonly male = 'Nữ';
}

export class Auth {
    public static readonly sketter = 'Sketter';

    public static readonly google = 'Google';
}

export class Status {
    public static readonly draft = 'Draft';
    public static readonly unverified = 'Unverified';

    public static readonly verified = 'Verified';

    public static readonly activated = 'Activated';

    public static readonly inactivated = 'Inactivated';

    public static readonly deactivated = 'Deactivated';

    public static readonly closed = 'Closed';

    public static readonly open = 'Open';

    public static readonly pending = 'Pending';

    public static readonly cancel = 'Cancel';

    public static readonly inStock = 'In Stock';

    public static readonly paying = 'Paying';

    public static readonly sold = 'Sold';

    public static readonly processing = 'Processing';

    public static readonly success = 'Success';

    public static readonly failed = 'Failed';

    public static readonly soldOut = 'Sold Out';

    public static readonly completed = 'Completed';

    public static readonly expired = 'Expired';

    public static readonly stop = 'Stop';

}

export const listStatusDestination = [Status.activated, Status.inactivated, Status.deactivated, Status.closed];
export const listStatusUser = [Status.unverified, Status.verified, Status.inactivated, Status.deactivated];
export const listRole = ['Admin', 'Manager', 'Supplier', 'Traveler'];