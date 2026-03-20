import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LikeButton } from '../like-button';

// Mock the post store
const mockToggleLike = jest.fn();
jest.mock('@/stores/post-store', () => ({
  usePostStore: () => ({
    toggleLike: mockToggleLike,
  }),
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Heart: (props: any) => <svg data-testid="heart-icon" {...props} />,
}));

beforeEach(() => {
  mockToggleLike.mockClear();
});

describe('LikeButton', () => {
  it('should render unliked state with heart icon', () => {
    render(
      <LikeButton postId="p1" isLiked={false} likeCount={0} />,
    );

    expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    expect(screen.getByText('いいね')).toBeInTheDocument();
  });

  it('should render liked state with emoji', () => {
    render(
      <LikeButton
        postId="p1"
        isLiked={true}
        likeCount={5}
        myReactionType="love"
      />,
    );

    // Should show the love emoji
    expect(screen.getByText('❤️')).toBeInTheDocument();
    // Should show the like count
    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('should render liked state with default emoji when no reactionType', () => {
    render(
      <LikeButton
        postId="p1"
        isLiked={true}
        likeCount={3}
        myReactionType="like"
      />,
    );

    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('should show reaction popup on hover after delay', async () => {
    jest.useFakeTimers();

    render(
      <LikeButton postId="p1" isLiked={false} likeCount={0} />,
    );

    // Hover over the container
    const container = screen.getByText('いいね').closest('.relative') as HTMLElement;
    fireEvent.mouseEnter(container);

    // Advance timer past the 500ms hover delay
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Reaction popup should now be visible with all emojis
    expect(screen.getByText('👍')).toBeInTheDocument();
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('😊')).toBeInTheDocument();
    expect(screen.getByText('😮')).toBeInTheDocument();
    expect(screen.getByText('😢')).toBeInTheDocument();
    expect(screen.getByText('😡')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('should call toggleLike on click', async () => {
    render(
      <LikeButton postId="p1" isLiked={false} likeCount={0} />,
    );

    const button = screen.getByRole('button', { name: /いいね/i });
    fireEvent.click(button);

    expect(mockToggleLike).toHaveBeenCalledWith('p1');
  });

  it('should call toggleLike to unlike when already liked', () => {
    render(
      <LikeButton postId="p1" isLiked={true} likeCount={3} myReactionType="like" />,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockToggleLike).toHaveBeenCalledWith('p1');
  });

  it('should not show like count when count is 0', () => {
    render(
      <LikeButton postId="p1" isLiked={false} likeCount={0} />,
    );

    expect(screen.queryByText('(0)')).not.toBeInTheDocument();
  });
});
