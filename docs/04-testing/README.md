# テスト戦略

> コープネット - 社内SNSシステム

## 概要

1名の開発者 + AI アシスタントのチーム構成のため、テストは**サービスロジックのユニットテスト**に集中し、費用対効果の高い部分を優先する。

---

## 1. テストフレームワーク

| レイヤー | フレームワーク | 用途 |
|----------|----------------|------|
| Backend ユニットテスト | Jest | サービスのビジネスロジック |
| Backend 統合テスト | Jest + Supertest | コントローラーのエンドポイント |
| Frontend ユニットテスト | Jest + React Testing Library | コンポーネント・フック |

---

## 2. Backend テスト

### 2.1 サービスユニットテスト（最優先）

サービス層のビジネスロジックをテストする。リポジトリや外部依存はモックする。

```typescript
// src/modules/post/post.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostService } from './post.service';
import { PostEntity } from './entities/post.entity';

describe('PostService', () => {
  let service: PostService;
  let mockPostRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockPostRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: getRepositoryToken(PostEntity),
          useValue: mockPostRepo,
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  describe('create', () => {
    it('投稿を作成して返すこと', async () => {
      const createDto = {
        body: 'テスト投稿',
        postDate: '2026-03-20',
      };
      const userId = 'user-uuid-123';
      const mockPost = { id: 'post-uuid-1', ...createDto, userId };

      mockPostRepo.create.mockReturnValue(mockPost);
      mockPostRepo.save.mockResolvedValue(mockPost);

      const result = await service.create(createDto, userId);

      expect(mockPostRepo.create).toHaveBeenCalledWith({
        ...createDto,
        userId,
      });
      expect(mockPostRepo.save).toHaveBeenCalledWith(mockPost);
      expect(result).toEqual(mockPost);
    });

    it('バックデートの投稿日を許容すること', async () => {
      const yesterday = '2026-03-19';
      const createDto = { body: '昨日の投稿', postDate: yesterday };
      const userId = 'user-uuid-123';
      const mockPost = { id: 'post-uuid-2', ...createDto, userId };

      mockPostRepo.create.mockReturnValue(mockPost);
      mockPostRepo.save.mockResolvedValue(mockPost);

      const result = await service.create(createDto, userId);
      expect(result.postDate).toBe(yesterday);
    });
  });

  describe('findAll', () => {
    it('ページネーション付きで投稿一覧を返すこと', async () => {
      const mockPosts = [
        { id: 'post-1', body: '投稿1' },
        { id: 'post-2', body: '投稿2' },
      ];
      const qb = mockPostRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([mockPosts, 2]);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.totalItems).toBe(2);
    });
  });
});
```

### 2.2 コントローラー統合テスト

HTTP エンドポイントの統合テスト。認証ガードやバリデーションパイプの動作を確認する。

```typescript
// src/modules/post/post.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PostController } from './post.controller';
import { PostService } from './post.service';

describe('PostController (Integration)', () => {
  let app: INestApplication;
  let mockPostService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockPostService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        { provide: PostService, useValue: mockPostService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/posts', () => {
    it('200: 投稿一覧を返すこと', async () => {
      mockPostService.findAll.mockResolvedValue({
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/v1/posts', () => {
    it('400: 本文が空の場合バリデーションエラー', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .send({ body: '' })
        .expect(400);
    });
  });
});
```

---

## 3. Frontend テスト

### 3.1 コンポーネントテスト

```tsx
// src/components/post-card/post-card.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './post-card';

const mockPost = {
  id: 'post-1',
  body: 'テスト投稿の本文です',
  postDate: '2026-03-20',
  user: {
    id: 'user-1',
    displayName: '田中太郎',
    avatarUrl: null,
  },
  likeCount: 5,
  commentCount: 3,
  isLiked: false,
};

describe('PostCard', () => {
  it('投稿の本文とユーザー名を表示すること', () => {
    render(<PostCard post={mockPost} />);

    expect(screen.getByText('テスト投稿の本文です')).toBeInTheDocument();
    expect(screen.getByText('田中太郎')).toBeInTheDocument();
  });

  it('いいねボタンをクリックするとonLikeが呼ばれること', async () => {
    const user = userEvent.setup();
    const onLike = jest.fn();

    render(<PostCard post={mockPost} onLike={onLike} />);

    await user.click(screen.getByRole('button', { name: /いいね/ }));
    expect(onLike).toHaveBeenCalledWith('post-1');
  });

  it('いいね数とコメント数を表示すること', () => {
    render(<PostCard post={mockPost} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
```

### 3.2 カスタムフックテスト

```tsx
// src/hooks/use-posts.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePosts } from './use-posts';

// API モック
jest.mock('@/lib/api', () => ({
  getPosts: jest.fn().mockResolvedValue({
    data: [{ id: 'post-1', body: 'テスト' }],
    meta: { totalItems: 1 },
  }),
}));

describe('usePosts', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('投稿一覧を取得すること', async () => {
    const { result } = renderHook(() => usePosts(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });
  });
});
```

---

## 4. テストコマンド

### Backend

```bash
# 全テスト実行
cd source/backend && npm test

# 特定サービスのテスト
npm test -- --testPathPattern=post.service

# ウォッチモード（開発中）
npm test -- --watch

# カバレッジレポート
npm test -- --coverage

# 統合テスト（e2e）
npm run test:e2e
```

### Frontend

```bash
# 全テスト実行
cd source/frontend && npm test

# 特定コンポーネントのテスト
npm test -- --testPathPattern=post-card

# ウォッチモード（開発中）
npm test -- --watch

# カバレッジレポート
npm test -- --coverage
```

---

## 5. テスト方針: 何をテストするか / しないか

### テストすべきもの（優先度順）

| 優先度 | 対象 | 理由 |
|--------|------|------|
| **高** | サービス層のビジネスロジック | バグの影響が大きい、リグレッション防止 |
| **高** | バリデーションロジック | 不正データの投入防止 |
| **高** | 認証・認可ロジック | セキュリティ上重要 |
| **中** | ユーティリティ関数 | 多くの場所で使われる |
| **中** | カスタムフック | 状態管理ロジック |
| **低** | コンポーネントの表示 | 主要なものだけ |

### テストしなくてよいもの

| 対象 | 理由 |
|------|------|
| TypeORMのリポジトリメソッド自体 | フレームワーク側の責務 |
| NestJSのデコレータ動作 | フレームワーク側の責務 |
| CSS / Tailwindクラス | ビジュアルは手動確認で十分 |
| 単純なCRUDの入出力マッピング | サービス層テストでカバー |
| 外部ライブラリの動作 | ライブラリ側の責務 |
| E2Eテスト（全画面通し） | 1名 + AI体制では維持コストが高い |

### テストカバレッジ目標

| 対象 | 目標カバレッジ |
|------|----------------|
| サービス層 | 80%以上 |
| ガード・パイプ | 70%以上 |
| コントローラー | 50%以上（主要エンドポイント） |
| フロントエンド全体 | 40%以上（重要コンポーネントのみ） |

---

## 6. テストファイル命名規約

| 対象 | パターン | 例 |
|------|----------|-----|
| Backend ユニットテスト | `*.spec.ts` | `post.service.spec.ts` |
| Backend E2E テスト | `*.e2e-spec.ts` | `post.e2e-spec.ts` |
| Frontend テスト | `*.test.tsx` / `*.test.ts` | `post-card.test.tsx` |

テストファイルは対象ファイルと同じディレクトリに配置する。
