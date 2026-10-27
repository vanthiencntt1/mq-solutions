import type { ContentBlocks } from './blocks';
import type { FaqRow, PageRow, PostRow } from './ports';

export type PublicPost = Omit<PostRow, 'contentJson'> & { blocks: ContentBlocks };
export type PublicPage = Omit<PageRow, 'contentJson'> & { blocks: ContentBlocks };
export type PublicFaq = Omit<FaqRow, 'answer'> & { blocks: ContentBlocks };
