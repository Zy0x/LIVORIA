export interface MediaGridTitleClasses {
  container: string;
  title: string;
}

export function getMediaGridTitleClasses(title: string): MediaGridTitleClasses {
  const normalized = title.replace(/\s+/g, ' ').trim();
  const wordCount = normalized ? normalized.split(' ').length : 0;
  const charCount = normalized.length;

  if (charCount <= 22 && wordCount <= 4) {
    return {
      container: 'mb-1 flex min-h-[2rem] items-center sm:min-h-[2.5rem]',
      title: 'line-clamp-2 text-[13px] font-bold leading-snug text-foreground sm:text-base',
    };
  }

  if (charCount <= 36 && wordCount <= 6) {
    return {
      container: 'mb-1 flex min-h-[2rem] items-center sm:min-h-[2.5rem]',
      title: 'line-clamp-2 text-[12px] font-bold leading-snug text-foreground sm:text-[15px]',
    };
  }

  return {
    container: 'mb-1 min-h-[2rem] sm:min-h-[2.5rem]',
    title: 'line-clamp-2 text-[11px] font-bold leading-tight text-foreground sm:text-sm',
  };
}
