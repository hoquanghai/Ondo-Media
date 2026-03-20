import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  Permission,
  UserPermission,
  Post,
  Like,
  Comment,
} from '@app/database';
import { PaginatedResponseDto } from '@app/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepo: Repository<UserPermission>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
  ) {}

  // ─── User CRUD ───

  async findAll(data: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;
    const sortBy = data.sortBy ?? 'shainBangou';
    const sortOrder = data.sortOrder ?? 'ASC';

    const qb = this.userRepo.createQueryBuilder('user');
    qb.where('user.sns_is_active = :isActive', { isActive: true });

    if (data.search) {
      qb.andWhere(
        '(user.shainName LIKE :search OR user.shainGroup LIKE :search OR user.username LIKE :search OR user.fullName LIKE :search)',
        { search: `%${data.search}%` },
      );
    }

    if (data.department) {
      qb.andWhere('user.shainGroup = :department', {
        department: data.department,
      });
    }

    const sortColumn = `user.${this.toColumnName(sortBy)}`;
    qb.orderBy(sortColumn, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const safeItems = items.map((u) => this.sanitizeUser(u));

    return PaginatedResponseDto.from(safeItems, total, page, limit);
  }

  async findById(data: { id: number }) {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.id },
    });
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'ユーザーが見つかりません' });
    }

    // Load permissions separately (cross-database, can't use relation)
    const userPermissions = await this.userPermissionRepo.find({
      where: { userId: data.id, isDeleted: false },
      relations: ['permission'],
    });

    const result = this.sanitizeUser(user);
    result.permissions = userPermissions
      .filter((up) => up.permission && !up.permission.isDeleted)
      .map((up) => up.permission.name);

    return result;
  }

  async findByUsername(data: { username: string }) {
    const user = await this.userRepo.findOne({
      where: { username: data.username },
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async findByEmail(data: { email: string }) {
    const user = await this.userRepo.findOne({
      where: { email: data.email },
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async findByMs365Id(data: { ms365Id: string }) {
    const user = await this.userRepo.findOne({
      where: { snsMs365Id: data.ms365Id },
    });
    return user ? this.sanitizeUser(user) : null;
  }

  async updateProfile(data: {
    id: number;
    shainName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    birthday?: string;
    address1?: string;
    snsBio?: string;
    snsAvatarUrl?: string;
    // legacy field names for backward compatibility
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }) {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.id },
    });
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'ユーザーが見つかりません' });
    }

    // Build update object with only changed fields
    const updateData: Record<string, any> = {};

    const name = data.shainName ?? data.displayName;
    if (name !== undefined) updateData.shainName = name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.birthday !== undefined) updateData.birthday = data.birthday;
    if (data.address1 !== undefined) updateData.address1 = data.address1;

    const bio = data.snsBio ?? data.bio;
    if (bio !== undefined) updateData.snsBio = bio;

    const avatar = data.snsAvatarUrl ?? data.avatarUrl;
    if (avatar !== undefined) updateData.snsAvatarUrl = avatar;

    if (Object.keys(updateData).length === 0) {
      return this.sanitizeUser(user);
    }

    await this.userRepo.update({ shainBangou: data.id }, updateData);

    // Fetch updated user
    const updated = await this.userRepo.findOne({
      where: { shainBangou: data.id },
    });
    return this.sanitizeUser(updated!);
  }

  async adminUpdate(data: {
    id: number;
    displayName?: string;
    department?: string;
    position?: string;
    isActive?: boolean;
    bio?: string;
  }) {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.id },
    });
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'ユーザーが見つかりません' });
    }

    if (data.displayName !== undefined) user.shainName = data.displayName;
    if (data.department !== undefined) user.shainGroup = data.department;
    if (data.position !== undefined) user.shainYaku = data.position;
    if (data.isActive !== undefined) user.snsIsActive = data.isActive;
    if (data.bio !== undefined) user.snsBio = data.bio;

    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  async deactivate(data: { id: number }) {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.id },
    });
    if (!user) {
      throw new RpcException({ statusCode: 404, message: 'ユーザーが見つかりません' });
    }

    user.snsIsActive = false;
    await this.userRepo.save(user);
    return { deleted: true };
  }

  async updateLastLogin(data: { id: number }) {
    await this.userRepo.update(data.id, { snsLastLoginAt: new Date() });
    return { updated: true };
  }

  // ─── Stats (My Page) ───

  async getStats(data: { userId: number }) {
    const userId = data.userId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Parallelize all independent queries
    const [
      totalPosts,
      postsThisMonth,
      activeDaysRows,
      allDateRows,
      totalLikesReceived,
      totalCommentsReceived,
      postedDaysThisMonthRows,
      lastPost,
    ] = await Promise.all([
      // Total posts
      this.postRepo.count({
        where: { userId, isDeleted: false },
      }),

      // Posts this month
      this.postRepo
        .createQueryBuilder('post')
        .where('post.user_id = :userId', { userId })
        .andWhere('post.is_deleted = :isDel', { isDel: false })
        .andWhere('post.post_date >= :start', { start: startOfMonthStr })
        .getCount(),

      // Active days in last 30 days
      this.postRepo
        .createQueryBuilder('post')
        .select('CAST(post.post_date AS DATE)', 'postDay')
        .where('post.user_id = :userId', { userId })
        .andWhere('post.is_deleted = :isDel', { isDel: false })
        .andWhere('post.post_date >= :start', { start: thirtyDaysAgoStr })
        .groupBy('CAST(post.post_date AS DATE)')
        .getRawMany(),

      // Streaks: all distinct post dates descending
      this.postRepo
        .createQueryBuilder('post')
        .select('CAST(post.post_date AS DATE)', 'postDay')
        .where('post.user_id = :userId', { userId })
        .andWhere('post.is_deleted = :isDel', { isDel: false })
        .groupBy('CAST(post.post_date AS DATE)')
        .orderBy('postDay', 'DESC')
        .getRawMany(),

      // Total likes received
      this.likeRepo
        .createQueryBuilder('like')
        .innerJoin('like.post', 'post')
        .where('post.user_id = :userId', { userId })
        .andWhere('like.is_deleted = :isDel', { isDel: false })
        .andWhere('post.is_deleted = :isDel2', { isDel2: false })
        .getCount(),

      // Total comments received
      this.commentRepo
        .createQueryBuilder('comment')
        .innerJoin('comment.post', 'post')
        .where('post.user_id = :userId', { userId })
        .andWhere('comment.user_id != :userId', { userId })
        .andWhere('comment.is_deleted = :isDel', { isDel: false })
        .andWhere('post.is_deleted = :isDel2', { isDel2: false })
        .getCount(),

      // Posted days this month (for missed days calc)
      this.postRepo
        .createQueryBuilder('post')
        .select('CAST(post.post_date AS DATE)', 'postDay')
        .where('post.user_id = :userId', { userId })
        .andWhere('post.is_deleted = :isDel', { isDel: false })
        .andWhere('post.post_date >= :start', { start: startOfMonthStr })
        .andWhere('post.post_date <= :end', { end: todayStr })
        .groupBy('CAST(post.post_date AS DATE)')
        .getRawMany(),

      // Last post date
      this.postRepo.findOne({
        where: { userId, isDeleted: false },
        order: { postDate: 'DESC' },
      }),
    ]);

    const activeDaysLast30 = activeDaysRows.length;
    const currentStreak = this.calculateCurrentStreak(allDateRows);
    const longestStreak = this.calculateLongestStreak(allDateRows);
    const daysInMonthSoFar = now.getDate();
    const missedDaysThisMonth = daysInMonthSoFar - postedDaysThisMonthRows.length;

    return {
      totalPosts,
      postsThisMonth,
      activeDaysLast30,
      currentStreak,
      longestStreak,
      totalLikesReceived,
      totalCommentsReceived,
      missedDaysThisMonth: Math.max(0, missedDaysThisMonth),
      lastPostDate: lastPost?.postDate ?? null,
    };
  }

  // ─── User Posts ───

  async getUserPosts(data: {
    userId: number;
    page?: number;
    limit?: number;
    date?: string;
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;

    const qb = this.postRepo.createQueryBuilder('post');
    qb.leftJoinAndSelect('post.files', 'files');
    qb.where('post.user_id = :userId', { userId: data.userId });
    qb.andWhere('post.is_deleted = :isDel', { isDel: false });

    if (data.date) {
      qb.andWhere('post.post_date = :date', { date: data.date });
    }

    qb.orderBy('post.created_at', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return PaginatedResponseDto.from(items, total, page, limit);
  }

  // ─── Permissions ───

  async getPermissions(data: { userId: number }) {
    const ups = await this.userPermissionRepo.find({
      where: { userId: data.userId, isDeleted: false },
      relations: ['permission'],
    });
    return ups.map((up) => ({
      id: up.permission.id,
      name: up.permission.name,
      description: up.permission.description,
      grantedAt: up.createdAt,
    }));
  }

  async grantPermission(data: {
    userId: number;
    permissionName: string;
    grantedBy: number;
  }) {
    const permission = await this.permissionRepo.findOne({
      where: { name: data.permissionName, isDeleted: false },
    });
    if (!permission) {
      throw new RpcException({ statusCode: 404, message: '権限が見つかりません' });
    }

    // Check if already granted
    const existing = await this.userPermissionRepo.findOne({
      where: {
        userId: data.userId,
        permissionId: permission.id,
        isDeleted: false,
      },
    });
    if (existing) {
      throw new RpcException({ statusCode: 409, message: '権限は既に付与されています' });
    }

    const up = this.userPermissionRepo.create({
      userId: data.userId,
      permissionId: permission.id,
      grantedBy: data.grantedBy,
    });
    const saved = await this.userPermissionRepo.save(up);
    return {
      id: saved.id,
      userId: data.userId,
      permissionId: permission.id,
      permissionName: permission.name,
      grantedAt: saved.createdAt,
    };
  }

  async revokePermission(data: { userId: number; permissionId: string }) {
    const up = await this.userPermissionRepo.findOne({
      where: {
        userId: data.userId,
        permissionId: data.permissionId,
        isDeleted: false,
      },
    });
    if (!up) {
      throw new RpcException({ statusCode: 404, message: 'ユーザー権限が見つかりません' });
    }

    up.isDeleted = true;
    await this.userPermissionRepo.save(up);
    return { deleted: true };
  }

  async setPermissions(data: {
    userId: number;
    permissionIds: string[];
    grantedBy: number;
  }) {
    // Soft-delete existing permissions
    await this.userPermissionRepo
      .createQueryBuilder()
      .update(UserPermission)
      .set({ isDeleted: true })
      .where('user_id = :userId', { userId: data.userId })
      .andWhere('is_deleted = :isDel', { isDel: false })
      .execute();

    if (data.permissionIds.length === 0) return [];

    // Create new permission records
    const entries = data.permissionIds.map((permissionId) =>
      this.userPermissionRepo.create({
        userId: data.userId,
        permissionId,
        grantedBy: data.grantedBy,
      }),
    );

    await this.userPermissionRepo.save(entries);
    return data.permissionIds;
  }

  async getAllPermissions() {
    return this.permissionRepo.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  // ─── Private Helpers ───

  private sanitizeUser(user: User): Record<string, any> {
    return {
      shainBangou: user.shainBangou,
      lastNumber: user.lastNumber,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      shainName: user.shainName,
      displayName: user.displayName,
      shainGroup: user.shainGroup,
      department: user.department,
      shainTeam: user.shainTeam,
      shainYaku: user.shainYaku,
      position: user.position,
      shainSection: user.shainSection,
      shainShigotoba: user.shainShigotoba,
      shainShigotoJoutai: user.shainShigotoJoutai,
      birthday: user.birthday,
      address1: user.address1,
      phone: user.phone,
      mobile: user.mobile,
      entranceDate: user.entranceDate,
      avatar: user.defaultAvatarUrl,
      avatarUrl: user.avatarUrl,
      snsAvatarUrl: user.snsAvatarUrl,
      snsBio: user.snsBio,
      bio: user.bio,
      snsIsActive: user.snsIsActive,
      snsLastLoginAt: user.snsLastLoginAt,
      hasPassword: !!user.snsPasswordHash,
    };
  }

  private toColumnName(camelCase: string): string {
    const mapping: Record<string, string> = {
      shainBangou: 'shainBangou',
      shainName: 'shainName',
      shainGroup: 'shainGroup',
      username: 'username',
      email: 'email',
      createdAt: 'shainBangou', // fallback, shainList has no created_at
    };
    return mapping[camelCase] ?? 'shainBangou';
  }

  private calculateCurrentStreak(dateRows: { postDay: string }[]): number {
    if (dateRows.length === 0) return 0;

    const dates = dateRows.map((r) => {
      const d = new Date(r.postDay);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffFromToday = Math.floor(
      (today.getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffFromToday > 1) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.floor(
        (dates[i - 1].getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  private calculateLongestStreak(dateRows: { postDay: string }[]): number {
    if (dateRows.length === 0) return 0;

    const dates = dateRows
      .map((r) => {
        const d = new Date(r.postDay);
        d.setHours(0, 0, 0, 0);
        return d;
      })
      .sort((a, b) => a.getTime() - b.getTime());

    let longest = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
      const diff = Math.floor(
        (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }

    return longest;
  }
}
