import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ContentBlock, ContentBlocks, Inline } from '@/lib/domain/content/blocks';
import { headingAnchor } from '@/lib/domain/content/heading-anchor';

function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith('/') ? (
    <Link className="text-deep-cobalt underline underline-offset-2" href={href}>
      {children}
    </Link>
  ) : (
    <a
      className="text-deep-cobalt underline underline-offset-2"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, index) => {
    let content: React.ReactNode = part.text;
    for (const mark of part.marks ?? []) {
      if (mark === 'bold') content = <strong>{content}</strong>;
      if (mark === 'italic') content = <em>{content}</em>;
      if (mark === 'underline') content = <u>{content}</u>;
      if (mark === 'code') content = <code className="bg-pebble rounded px-1">{content}</code>;
    }
    return <span key={index}>{part.href ? <SafeLink href={part.href}>{content}</SafeLink> : content}</span>;
  });
}

function Block({ block, index }: { block: ContentBlock; index: number }) {
  switch (block.type) {
    case 'heading': {
      const id = headingAnchor(block.text, index);
      if (block.level === 2)
        return (
          <h2 id={id} className="mt-10 mb-4 text-[26px] leading-tight md:text-[38px]">
            {block.text}
          </h2>
        );
      if (block.level === 3)
        return (
          <h3 id={id} className="mt-8 mb-3 text-[22px]">
            {block.text}
          </h3>
        );
      return (
        <h4 id={id} className="mt-6 mb-2 text-[18px]">
          {block.text}
        </h4>
      );
    }
    case 'paragraph':
      return (
        <p className="mb-5 leading-7">
          <InlineText parts={block.content} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`mb-5 space-y-2 pl-6 leading-7 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineText parts={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'image':
      return (
        <figure className="my-8">
          <Image
            src={block.src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            unoptimized
            className="h-auto w-full rounded-xl"
          />
          <figcaption className="text-body-sm text-slate-gray mt-2 text-center">
            {block.caption ?? block.alt}
          </figcaption>
        </figure>
      );
    case 'quote':
      return (
        <blockquote className="border-primary bg-info-bg my-8 rounded-r-xl border-l-4 p-5 text-[18px] leading-7">
          <InlineText parts={block.content} />
          {block.attribution && (
            <cite className="text-body-sm text-slate-gray mt-2 block not-italic">— {block.attribution}</cite>
          )}
        </blockquote>
      );
    case 'table':
      return (
        <div className="border-hairline my-6 overflow-x-auto rounded-xl border">
          <table className="text-body-sm w-full min-w-[480px] text-left">
            <thead className="bg-pebble">
              <tr>
                {block.headers.map((header, i) => (
                  <th key={i} className="p-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-hairline border-t">
                  {row.map((cell, j) => (
                    <td key={j} className="p-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'callout': {
      const Icon = block.tone === 'warning' ? CircleAlert : block.tone === 'success' ? CircleCheck : Info;
      return (
        <aside className="bg-info-bg my-6 flex gap-3 rounded-xl p-5">
          <Icon className="text-info mt-1 size-5 shrink-0" aria-hidden />
          <div>
            {block.title && <p className="font-semibold">{block.title}</p>}
            <p className="leading-7">
              <InlineText parts={block.content} />
            </p>
          </div>
        </aside>
      );
    }
    case 'faq':
      return (
        <div className="my-6 space-y-3">
          {block.items.map((item, i) => (
            <details key={i} className="border-hairline bg-paper rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">{item.question}</summary>
              <p className="mt-3 leading-7">
                <InlineText parts={item.answer} />
              </p>
            </details>
          ))}
        </div>
      );
    case 'button':
      return (
        <p className="my-6">
          <SafeLink href={block.href}>{block.label} →</SafeLink>
        </p>
      );
    case 'video':
      return (
        <div className="my-8 aspect-video overflow-hidden rounded-xl">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}`}
            title={block.title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
  }
}

// A04 mục 2: React tự escape chuỗi từ CMS; renderer chỉ nhận union đã được ContentService kiểm.
export function BlockRenderer({ blocks }: { blocks: ContentBlocks }) {
  return (
    <div className="text-ink-navy max-w-none">
      {blocks.map((block, index) => (
        <Block key={index} block={block} index={index} />
      ))}
    </div>
  );
}
