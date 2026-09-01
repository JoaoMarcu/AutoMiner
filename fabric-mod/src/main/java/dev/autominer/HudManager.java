package dev.autominer;
import net.minecraft.client.MinecraftClient;import net.minecraft.client.gui.DrawContext;
public final class HudManager {
  public void render(DrawContext ctx,AutoMinerConfig cfg,Telemetry t){ if(!cfg.advanced.hud)return; var mc=MinecraftClient.getInstance(); if(mc.textRenderer==null)return; int x=6,y=6,c=0x66FFFF;
    ctx.fill(x-4,y-4,x+220,y+78,0xAA0B121A);
    ctx.drawText(mc.textRenderer,"AutoMiner ["+t.state+"]",x,y,c,false);
    ctx.drawText(mc.textRenderer,"F6: iniciar / parar",x,y+11,0xFFFFFF,false);
    ctx.drawText(mc.textRenderer,"F7: ocultar este HUD",x,y+22,0xFFFFFF,false);
    ctx.drawText(mc.textRenderer,"Área: "+t.areaPhase+" "+t.corridor+"/"+t.corridorCount,x,y+33,0xFFFFFF,false);
    ctx.drawText(mc.textRenderer,"Blocos: "+t.blocksBroken,x,y+44,0xFFFFFF,false);
    ctx.drawText(mc.textRenderer,"Alvo: "+(t.target!=null?t.target.id():"-"),x,y+44,0xFFFFFF,false);
    ctx.drawText(mc.textRenderer,"Painel: "+(t.online?"conectado":"offline"),x,y+55,t.online?0x66FF99:0xFFAA33,false);
  }
}
