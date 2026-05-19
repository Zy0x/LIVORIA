import MediaCard from '@/components/shared/MediaCard';
import type { WaifuItem } from '../types/waifu.types';

type WaifuCardProps = {
  waifu: WaifuItem;
  onEdit: () => void;
  onDelete: () => void;
};

export function WaifuCard({ waifu, onEdit, onDelete }: WaifuCardProps) {
  return (
    <MediaCard
      id={waifu.id}
      title={waifu.name}
      coverUrl={waifu.image_url}
      status="completed"
      type="waifu"
      waifuTier={waifu.tier}
      waifuSource={waifu.source}
      waifuSourceType={waifu.source_type}
      notes={waifu.notes}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
