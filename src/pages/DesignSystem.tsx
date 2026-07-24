import * as React from "react";
import { Leaf, Bell, User, Plus, Search } from "lucide-react";
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

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <h2 className="type-h2">{title}</h2>
    <SurfaceCard>{children}</SurfaceCard>
  </section>
);

export default function DesignSystem() {
  const [nome, setNome] = React.useState("Maria de Fátima");
  const [cmdOpen, setCmdOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        <header className="space-y-2">
          <span className="type-label">MFM Design System v1</span>
          <h1 className="type-display">Sistema, calmo e editorial.</h1>
          <p className="type-body text-muted-foreground max-w-2xl">
            Tudo aqui vem dos tokens em <code>index.css</code>. Nenhum componente crava cor ou tamanho.
          </p>
        </header>

        <Section title="Tipografia">
          <div className="space-y-3">
            <p className="type-display">Display 44 / Fraunces</p>
            <p className="type-h1">Headline 32</p>
            <p className="type-h2">Headline 24</p>
            <p className="type-h3">Headline 18</p>
            <p className="type-body">Body 15 / Inter — corpo padrão da interface.</p>
            <p className="type-small text-muted-foreground">Small 13 / meta e legendas.</p>
            <p className="type-label">Label CAPS 11</p>
          </div>
        </Section>

        <Section title="Cores & Faróis">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "background", cls: "bg-background border" },
              { name: "card", cls: "bg-card border" },
              { name: "primary", cls: "bg-primary" },
              { name: "accent", cls: "bg-accent" },
              { name: "ok", cls: "bg-ok" },
              { name: "warn", cls: "bg-warn" },
              { name: "attention", cls: "bg-attention" },
              { name: "danger", cls: "bg-danger" },
            ].map((c) => (
              <div key={c.name} className="space-y-2">
                <div className={`${c.cls} h-16 rounded-[10px] shadow-e1`} />
                <p className="type-small">{c.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sombras (profundidade > borda)">
          <div className="grid grid-cols-3 gap-4">
            {["e1", "e2", "e3"].map((s) => (
              <div key={s} className={`bg-card rounded-[14px] p-6 shadow-${s} text-center`}>
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
            <Chip tone="accent">Marinho</Chip>
            <Chip active>Ativo</Chip>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid md:grid-cols-2 gap-4">
            <SurfaceCard interactive>
              <SurfaceCardHeader label="Resumo" action={<Badge variant="outline">novo</Badge>} />
              <p className="type-h3 mb-1">Cartão elevado</p>
              <p className="type-small text-muted-foreground">Hover eleva de e2 para e3 com escala sutil.</p>
            </SurfaceCard>
            <Card>
              <CardHeader>
                <CardTitle>Card shadcn</CardTitle>
                <CardDescription>Retematizado com tokens</CardDescription>
              </CardHeader>
              <CardContent className="type-body text-muted-foreground">
                Corpo do cartão com o token <code>--card</code> (off-white) sobre o fundo areia.
              </CardContent>
            </Card>
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
                <p className="type-body text-muted-foreground mt-4">Conteúdo do drawer.</p>
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
