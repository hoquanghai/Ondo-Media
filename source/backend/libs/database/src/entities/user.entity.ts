import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('shainList', { database: 'DR', schema: 'dbo' })
export class User {
  @PrimaryColumn({ name: 'shainBangou', type: 'int' })
  shainBangou: number;

  @Column({ name: 'username', type: 'nvarchar', length: 50, nullable: true })
  username: string;

  @Column({ name: 'email', type: 'nvarchar', length: 50, nullable: true })
  email: string;

  @Column({ name: 'fullName', type: 'nvarchar', length: 255, nullable: true })
  fullName: string;

  @Column({ name: 'shainName', type: 'nvarchar', length: 255, nullable: true })
  shainName: string;

  @Column({ name: 'shainGroup', type: 'nvarchar', length: 255, nullable: true })
  shainGroup: string;

  @Column({ name: 'shainTeam', type: 'nvarchar', length: 50, nullable: true })
  shainTeam: string;

  @Column({ name: 'shainYaku', type: 'nvarchar', length: 255, nullable: true })
  shainYaku: string;

  @Column({ name: 'shainSection', type: 'nvarchar', length: 50, nullable: true })
  shainSection: string;

  @Column({ name: 'shainShigotoba', type: 'nvarchar', length: 255, nullable: true })
  shainShigotoba: string;

  @Column({ name: 'shainShigotoJoutai', type: 'nvarchar', length: 255, nullable: true })
  shainShigotoJoutai: string;

  @Column({ name: 'birthday', type: 'date', nullable: true })
  birthday: string;

  @Column({ name: 'address1', type: 'nvarchar', nullable: true })
  address1: string;

  @Column({ name: 'phone', type: 'nvarchar', length: 255, nullable: true })
  phone: string;

  @Column({ name: 'mobile', type: 'nvarchar', length: 255, nullable: true })
  mobile: string;

  @Column({ name: 'entranceDate', type: 'date', nullable: true })
  entranceDate: string;

  @Column({ name: 'lastNumber', type: 'int', nullable: true })
  lastNumber: number;

  @Column({ name: 'avatar', type: 'nvarchar', length: 255, nullable: true })
  avatar: string;

  // SNS columns
  @Column({ name: 'sns_password_hash', type: 'nvarchar', length: 255, nullable: true })
  snsPasswordHash: string;

  @Column({ name: 'sns_password_created_at', type: 'datetime2', nullable: true })
  snsPasswordCreatedAt: Date;

  @Column({ name: 'sns_ms365_id', type: 'nvarchar', length: 255, nullable: true })
  snsMs365Id: string;

  @Column({ name: 'sns_last_login_at', type: 'datetime2', nullable: true })
  snsLastLoginAt: Date;

  @Column({ name: 'sns_bio', type: 'nvarchar', length: 1000, nullable: true })
  snsBio: string;

  @Column({ name: 'sns_avatar_url', type: 'nvarchar', length: 500, nullable: true })
  snsAvatarUrl: string;

  @Column({ name: 'sns_is_active', type: 'bit', default: true })
  snsIsActive: boolean;

  @Column({ name: 'sns_refresh_token_hash', type: 'nvarchar', length: 255, nullable: true })
  snsRefreshTokenHash: string;

  // Virtual getters for backward compatibility
  get displayName(): string {
    return this.shainName || this.fullName || this.username || '';
  }

  get department(): string {
    return this.shainGroup || '';
  }

  get position(): string {
    return this.shainYaku || '';
  }

  get avatarUrl(): string | null {
    // Priority: 1) custom SNS avatar → 2) CDN default from lastNumber → 3) legacy avatar
    if (this.snsAvatarUrl) return this.snsAvatarUrl;
    if (this.lastNumber) return `https://ondo-metal.sgp1.cdn.digitaloceanspaces.com/avatars/${this.lastNumber}.jpg`;
    return this.avatar || null;
  }

  get defaultAvatarUrl(): string | null {
    if (this.lastNumber) return `https://ondo-metal.sgp1.cdn.digitaloceanspaces.com/avatars/${this.lastNumber}.jpg`;
    return this.avatar || null;
  }

  get bio(): string | null {
    return this.snsBio || null;
  }

  get isActive(): boolean {
    return this.snsIsActive;
  }

  get lastLoginAt(): Date | null {
    return this.snsLastLoginAt || null;
  }
}
