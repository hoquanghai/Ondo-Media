import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MediaGallery } from '../media-gallery';
import type { PostFile } from '@/types/post';

// Mock child components
jest.mock('../media-lightbox', () => ({
  MediaLightbox: ({ initialIndex, onClose }: any) => (
    <div data-testid="lightbox" data-index={initialIndex}>
      <button data-testid="close-lightbox" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

jest.mock('../video-player', () => ({
  VideoPlayer: ({ src, onClickFullscreen }: any) => (
    <div data-testid="video-player" data-src={src} onClick={onClickFullscreen}>
      Video
    </div>
  ),
}));

function makeFile(id: string, overrides: Partial<PostFile> = {}): PostFile {
  return {
    id,
    fileName: `image-${id}.jpg`,
    storageKey: `key-${id}`,
    fileUrl: `https://example.com/${id}.jpg`,
    mimeType: 'image/jpeg',
    fileType: 'image',
    fileSize: 1024,
    sortOrder: 0,
    ...overrides,
  };
}

describe('MediaGallery', () => {
  it('should render nothing when no media files', () => {
    const docFile = makeFile('d1', {
      fileType: 'document',
      mimeType: 'application/pdf',
    });

    const { container } = render(<MediaGallery files={[docFile]} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render 1 image full width', () => {
    const file = makeFile('img1');
    render(<MediaGallery files={[file]} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('alt', 'image-img1.jpg');
  });

  it('should render 2 images side by side', () => {
    const files = [
      makeFile('a', { sortOrder: 0 }),
      makeFile('b', { sortOrder: 1 }),
    ];
    render(<MediaGallery files={files} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('should render 3 images in 1+2 layout', () => {
    const files = [
      makeFile('a', { sortOrder: 0 }),
      makeFile('b', { sortOrder: 1 }),
      makeFile('c', { sortOrder: 2 }),
    ];
    render(<MediaGallery files={files} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('should render 4 images in 2x2 grid', () => {
    const files = [
      makeFile('a', { sortOrder: 0 }),
      makeFile('b', { sortOrder: 1 }),
      makeFile('c', { sortOrder: 2 }),
      makeFile('d', { sortOrder: 3 }),
    ];
    render(<MediaGallery files={files} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4);
  });

  it('should render 5+ with +N overlay', () => {
    const files = Array.from({ length: 7 }, (_, i) =>
      makeFile(`img${i}`, { sortOrder: i }),
    );
    render(<MediaGallery files={files} />);

    // Only 5 images should be shown in the grid
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(5);

    // Should show +2 overlay (7 - 5 = 2)
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should not show +N overlay for exactly 5 images', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      makeFile(`img${i}`, { sortOrder: i }),
    );
    render(<MediaGallery files={files} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(5);

    // remaining = 5 - 5 = 0, so no overlay
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it('should open lightbox on image click', () => {
    const file = makeFile('img1');
    render(<MediaGallery files={[file]} />);

    // Click the image button
    const imageButton = screen.getByRole('button');
    fireEvent.click(imageButton);

    // Lightbox should appear
    expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    expect(screen.getByTestId('lightbox')).toHaveAttribute('data-index', '0');
  });

  it('should close lightbox', () => {
    const file = makeFile('img1');
    render(<MediaGallery files={[file]} />);

    // Open lightbox
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('lightbox')).toBeInTheDocument();

    // Close lightbox
    fireEvent.click(screen.getByTestId('close-lightbox'));
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('should filter out document files', () => {
    const imageFile = makeFile('img1', { fileType: 'image', mimeType: 'image/jpeg' });
    const docFile = makeFile('doc1', { fileType: 'document', mimeType: 'application/pdf' });

    render(<MediaGallery files={[imageFile, docFile]} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
  });
});
