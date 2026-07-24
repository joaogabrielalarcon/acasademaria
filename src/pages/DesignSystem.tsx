import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Leaf, Bell, User, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Chip } from "@/components/primitives/Chip";
import { InlineField } from "@/components/primitives/InlineField";
import { SurfaceCard, SurfaceCardHeader } from "@/components/primitives/SurfaceCard";
import { AlertBar } from "@/components/blocks/AlertBar";
import { FeedItem } from "@/components/blocks/FeedItem";
import { CommandPalette } from "@/components/blocks/CommandPalette";

const NEUTRAL_STEPS = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;


const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    className="space-y-4"
  >
    <div>
      <h2 className="type-h2">{title}</h2>
      {subtitle && <p className="type-small text-muted-foreground mt-1">{subtitle}</p>}
    </div>
    <SurfaceCard>{children}</SurfaceCard>
  </motion.section>
);

function Ramp({ name, steps }: { name: string; steps: readonly number[] }) {
  return (
    <div className="space-y-2">
      <p className="type-label">{name}</p>
      <div className="flex rounded-lg overflow-hidden shadow-e1">
        {steps.map((s) => (
          <div
            key={s}
            className="flex-1 h-14 flex items-end justify-center pb-1 text-[10px] tabular-nums"
            style={{
              background: `var(--${name}-${s})`,
              color: s >= 500 ? "var(--neutral-50)" : "var(--neutral-900)",
            }}
            title={`--${name}-${s}`}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("pt-BR"));
  React.useEffect(() => {
    const controls = animate(mv, to, { duration: 1.2, ease: [0.2, 0.8, 0.2, 1] });
    return controls.stop;
  }, [to, mv]);
  return <motion.span className="tabular-nums">{rounded}</motion.span>;
}

export default function DesignSystem() {
  const [nome, setNome] = React.useState("Maria de Fátima");
  const [cmdOpen, setCmdOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        {/* Faixa-herói de marca */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          className="hero-band"
        >
          <span className="type-label">MFM Design System v2</span>
          <h1 className="type-display mt-1">Terracota sobre creme. Com profundidade.</h1>
          <p className="type-body mt-2 opacity-90 max-w-2xl">
            Escalas OKLCH 50→950, superfícies em degrau, estados por intenção, movimento com propósito.
            Tudo aqui vem dos tokens em <code className="tabular-nums">index.css</code>.
          </p>
        </motion.header>

        <Section title="Tipografia" subtitle="Cormorant Garamond nos títulos. Avenir Next / Nunito Sans no corpo. Números sempre no sans.">
          <div className="space-y-3">
            <p className="type-display">Display 44 / Cormorant Garamond</p>
            <p className="type-h1">Headline 32</p>
            <p className="type-h2">Headline 24</p>
            <p className="type-h3">Headline 18</p>
            <p className="type-body">Body 15 / Avenir Next — corpo padrão da interface.</p>
            <p className="type-small text-muted-foreground">Small 13 / meta e legendas.</p>
            <p className="type-label">Label CAPS 11</p>
            <p className="type-body">Números tabulares: <span className="tabular-nums">1.284.500,00</span> · <CountUp to={12480} /> visitas neste mês.</p>
          </div>
        </Section>

        <Section title="Escalas OKLCH 50→950" subtitle="Perceptualmente uniformes. Âncoras da marca preservadas em ~700 (terracota) e ~800 (marinho).">
          <div className="space-y-4">
            <Ramp name="terracota" steps={BRAND_STEPS} />
            <Ramp name="marinho" steps={BRAND_STEPS} />
            <Ramp name="verde" steps={BRAND_STEPS} />
            <Ramp name="argila" steps={BRAND_STEPS} />
            <Ramp name="neutral" steps={NEUTRAL_STEPS} />
          </div>
        </Section>

        <Section title="Superfícies (degrau creme → branco quente)" subtitle="A elevação vem do degrau + sombra, nunca de borda dura.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "surface-bg", label: "Fundo da página" },
              { name: "surface-sunken", label: "Sunken (inputs, listras)" },
              { name: "surface-card", label: "Card / superfície" },
              { name: "surface-elevated", label: "Elevated (popover, drawer)" },
            ].map((s) => (
              <div key={s.name} className="space-y-2">
                <div
                  className="h-24 rounded-lg shadow-e2 flex items-end p-3"
                  style={{ background: `var(--${s.name})`, color: "var(--neutral-900)" }}
                >
                  <span className="type-small">{s.label}</span>
                </div>
                <p className="type-label">--{s.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Estados semânticos (por intenção)" subtitle="Nunca 'green-100'. Sempre success / warning / danger / info.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["success", "warning", "danger", "info"] as const).map((k) => (
              <div key={k} className={`state-${k} rounded-lg p-4 shadow-e1`}>
                <p className="type-label" style={{ color: "inherit", opacity: 0.75 }}>{k}</p>
                <p className="type-h3 mt-1" style={{ color: "inherit" }}>Exemplo</p>
                <p className="type-small mt-1" style={{ color: "inherit", opacity: 0.85 }}>Fundo -bg · Texto -fg</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sombras (profundidade > borda)">
          <div className="grid grid-cols-3 gap-4">
            {["e1", "e2", "e3"].map((s) => (
              <div key={s} className={`bg-card rounded-lg p-6 shadow-${s} text-center`}>
                <p className="type-label">{s}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="add"><Plus className="w-4 h-4" /></Button>
          </div>
        </Section>

        <Section title="Badges & Chips">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Chip>Neutro</Chip>
            <Chip variant="navy">Marinho</Chip>
            <Chip variant="active">Ativo</Chip>
          </div>
        </Section>

        <Section title="Cards" subtitle="Hover: scale 1.01 + elevação e2 → e3 (o toque tátil).">
          <div className="grid md:grid-cols-2 gap-4">
            <SurfaceCard interactive>
              <SurfaceCardHeader label="Resumo" action={<Badge variant="outline">novo</Badge>} />
              <p className="type-h3 mb-1">Cartão elevado</p>
              <p className="type-small text-muted-foreground">Filete à esquerda em terracota. Off-white quente sobre o creme.</p>
            </SurfaceCard>
            <Card>
              <CardHeader>
                <CardTitle>Card shadcn</CardTitle>
                <CardDescription>Retematizado com tokens</CardDescription>
              </CardHeader>
              <CardContent className="type-body text-muted-foreground">
                Corpo do cartão com o token <code>--card</code> (off-white quente) sobre o fundo areia.
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Movimento — samples" subtitle="Framer-motion. Sempre com propósito: orienta e deleita, nunca lento nem saltitante.">
          <div className="grid md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.01, boxShadow: "var(--shadow-e3)" }}
              transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="bg-card rounded-lg shadow-e2 p-5"
            >
              <p className="type-label">Hover tátil</p>
              <p className="type-body mt-1">Passe o mouse aqui.</p>
            </motion.div>

            <div className="bg-card rounded-lg shadow-e2 p-5">
              <p className="type-label">Stagger reveal</p>
              <motion.ul
                className="mt-2 space-y-1"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              >
                {["Clientes", "Projetos", "Equipe", "Diário"].map((t) => (
                  <motion.li
                    key={t}
                    variants={{
                      hidden: { opacity: 0, y: 6, scale: 0.94 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 24 } },
                    }}
                    className="type-body"
                  >
                    · {t}
                  </motion.li>
                ))}
              </motion.ul>
            </div>

            <div className="bg-card rounded-lg shadow-e2 p-5">
              <p className="type-label">Count-up + Pulso</p>
              <p className="type-display leading-none mt-1"><CountUp to={2847} /></p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 animate-pulse-soft">
                <Sparkles className="w-3 h-3" />
                <span className="type-small">alerta urgente</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">Visão geral</TabsTrigger>
              <TabsTrigger value="b">Histórico</TabsTrigger>
              <TabsTrigger value="c">Documentos</TabsTrigger>
            </TabsList>
            <TabsContent value="a" className="type-body pt-4">Conteúdo da aba A.</TabsContent>
            <TabsContent value="b" className="type-body pt-4">Conteúdo da aba B.</TabsContent>
            <TabsContent value="c" className="type-body pt-4">Conteúdo da aba C.</TabsContent>
          </Tabs>
        </Section>

        <Section title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Maria</TableCell>
                <TableCell>Coordenação</TableCell>
                <TableCell className="text-right"><Badge>ativa</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>João</TableCell>
                <TableCell>Campo</TableCell>
                <TableCell className="text-right"><Badge variant="outline">férias</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

        <Section title="AlertBar">
          <div className="space-y-2">
            <AlertBar tone="ok" count={12} title="Tudo em dia por aqui." />
            <AlertBar tone="warn" count={3} title="Cotações vencendo em 48h." />
            <AlertBar tone="attention" count={5} title="Diários aguardando revisão." />
            <AlertBar tone="danger" count={1} title="Falha de envio no e-mail do cliente." />
          </div>
        </Section>

        <Section title="FeedItem">
          <div className="divide-y divide-border">
            <FeedItem icon={<Leaf className="w-4 h-4" />} title="Visita registrada" meta="Ontem · 16h32" />
            <FeedItem icon={<Bell className="w-4 h-4" />} title="Alerta de clima" meta="Terça · 09h" hasIssue />
            <FeedItem icon={<User className="w-4 h-4" />} title="Nota da coordenação adicionada" meta="Segunda · 11h" />
          </div>
        </Section>

        <Section title="InlineField">
          <div className="max-w-md">
            <InlineField label="Nome completo" value={nome} onSave={(v) => setNome(String(v))} />
            <InlineField label="Cargo" value="Coordenadora de campo" />
          </div>
        </Section>

        <Section title="HoverCard, Drawer & Command Palette">
          <div className="flex flex-wrap items-center gap-3">
            <HoverCard>
              <HoverCardTrigger asChild><Button variant="outline">Hover me</Button></HoverCardTrigger>
              <HoverCardContent>Informação secundária, sem sair do fluxo.</HoverCardContent>
            </HoverCard>

            <Sheet>
              <SheetTrigger asChild><Button variant="secondary">Abrir Drawer</Button></SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Drawer lateral</SheetTitle></SheetHeader>
                <p className="type-body text-muted-foreground mt-4">Desliza da direita com spring gentil.</p>
              </SheetContent>
            </Sheet>

            <Button variant="outline" onClick={() => setCmdOpen(true)}>
              <Search className="w-4 h-4 mr-2" /> Command Palette (⌘K)
            </Button>
            <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
          </div>
        </Section>
      </div>
    </div>
  );
}
