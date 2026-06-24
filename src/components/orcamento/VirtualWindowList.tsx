import { useRef, type ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

interface Props {
  count: number;
  renderItem: (index: number) => ReactNode;
  /** altura estimada inicial de cada card; o virtualizer mede dinamicamente. */
  estimateSize?: number;
  overscan?: number;
  /** chave estável por item para evitar remount ao reordenar */
  getKey?: (index: number) => string | number;
}

/**
 * Virtualiza uma lista de Cards usando o scroll da janela.
 * Usa measureElement para suportar altura variável (cards colapsáveis).
 */
export function VirtualWindowList({
  count,
  renderItem,
  estimateSize = 320,
  overscan = 3,
  getKey,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useWindowVirtualizer({
    count,
    estimateSize: () => estimateSize,
    overscan,
    scrollMargin: parentRef.current?.offsetTop ?? 0,
  });

  const items = virtualizer.getVirtualItems();
  const offset = parentRef.current?.offsetTop ?? 0;

  return (
    <div
      ref={parentRef}
      style={{
        position: "relative",
        height: virtualizer.getTotalSize(),
        width: "100%",
      }}
    >
      {items.map((vi) => (
        <div
          key={getKey ? getKey(vi.index) : vi.key}
          data-index={vi.index}
          ref={virtualizer.measureElement}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${vi.start - offset}px)`,
            paddingBottom: 12,
          }}
        >
          {renderItem(vi.index)}
        </div>
      ))}
    </div>
  );
}
