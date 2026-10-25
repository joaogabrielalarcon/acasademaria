# Mede as 6 telas logado: tempo ate rede ociosa, buscas ao backend, volume.
import asyncio, json, os, sys, time
from playwright.async_api import async_playwright
P="2b43fb0b-445c-4aec-a873-4561a7b90286"; O="ea6f97cf-32c2-4cb8-8207-a066eb48b40e"
TELAS=[("Meu Dia","/"),("Projetos (funil)","/projetos"),("Projeto, painel",f"/projetos/{P}/painel"),
("Projeto, detalhe",f"/projetos/{P}"),("Clientes","/clientes"),("Orçamento",f"/orcamentos/{O}"),("Equipe","/equipe")]
async def main():
    with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f: m=json.load(f)
    out=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True)
        for nome,rota in TELAS:
            ctx=await b.new_context(viewport={"width":1280,"height":1800}); pg=await ctx.new_page()
            await pg.goto("http://localhost:8080/login"); await pg.evaluate("([k,v])=>localStorage.setItem(k,v)",[m["storage_key"],json.dumps(m["session"])])
            reqs=[]; errs=[]
            def on_resp(r):
                if "supabase.co" in r.url and ("/rest/" in r.url or "/functions/" in r.url):
                    reqs.append(r)
                    if r.status>=400: errs.append(f"{r.status} {r.url[:120]}")
            pg.on("response",on_resp)
            t=time.time(); await pg.goto("http://localhost:8080"+rota)
            try: await pg.wait_for_load_state("networkidle",timeout=30000)
            except Exception: pass
            ms=int((time.time()-t)*1000); tot=0
            for r in reqs:
                try: tot+=len(await r.body())
                except Exception: pass
            out.append((nome,ms,len(reqs),tot//1024,errs)); await ctx.close()
        await b.close()
    for o in out: print(f"| {o[0]} | {o[1]} | {o[2]} | {o[3]} KB | {o[4] or ''}")
asyncio.run(main())
