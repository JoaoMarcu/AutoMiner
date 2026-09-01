package dev.autominer;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.registry.Registries;
import net.minecraft.util.math.*;
import java.util.concurrent.atomic.AtomicReference;

public final class AutoMinerController implements AutoCloseable {
  public enum State { STOPPED,RUNNING,PAUSED,SEARCHING,AIMING,MINING,RECOVERING,ERROR }
  private final MovementController movement=new MovementController(); private final CameraController camera=new CameraController(); private final MiningController mining=new MiningController();
  private final TargetSelector selector=new TargetSelector(); private final TargetHistory history=new TargetHistory(); private final JumpController jump=new JumpController(); private final HudManager hud=new HudManager();
  private final ConfigManager configs=new ConfigManager(); private final Telemetry telemetry=new Telemetry(); private final AtomicReference<State> state=new AtomicReference<>(State.STOPPED);
  private volatile AutoMinerConfig config; private volatile boolean hudVisible; private volatile MiningAreaSession area; private LocalApiServer api; private BlockPos target; private float baseYaw; private long startedAt,lastAction;
  public AutoMinerController(AutoMinerConfig config){this.config=config;this.hudVisible=config.advanced.hud;try{api=new LocalApiServer(this,configs);api.start(config.advanced.apiPort);}catch(Exception e){telemetry.lastError=e.getMessage();}}
  public void toggle(MinecraftClient c){if(state.get()==State.STOPPED||state.get()==State.PAUSED)start(c);else stop(c);}
  public void start(MinecraftClient c){if(c.player==null)return;baseYaw=c.player.getYaw();area=new MiningAreaSession(c.player.getPos(),baseYaw,config.movement.searchDistance,config.movement.lateralRange);startedAt=System.currentTimeMillis();state.set(State.RUNNING);}
  public void pause(MinecraftClient c){state.set(State.PAUSED);release(c);} public void resume(MinecraftClient c){if(c.player!=null)state.set(State.SEARCHING);} public void stop(MinecraftClient c){state.set(State.STOPPED);target=null;release(c);}
  public void reload(){config=configs.load();}
  public void tick(MinecraftClient c){
    telemetry.state=state.get().name(); if(c.player==null||c.world==null||c.player.isDead()){if(state.get()!=State.STOPPED)stop(c);return;} updateTelemetry(c);
    if(state.get()==State.STOPPED||state.get()==State.PAUSED||c.isPaused()){release(c);return;}
    if(config.movement.forward) movement.apply(c,config.movement.sprint); else movement.release(c);
    if(target==null||!mining.valid(c,target,config)){mining.release(c);target=selector.select(c,config,history,baseYaw,area);state.set(target==null?State.RECOVERING:State.AIMING);if(target==null){if(area!=null)area.nextCorridor();camera.returnTo(c.player,baseYaw,config.camera);if(area!=null)area.beginCorridor();return;}}
    jump.tick(c,target,config); if(!camera.aim(c.player,target,config.camera)){state.set(State.AIMING);return;} state.set(State.MINING);
    long delay=config.mining.breakDelayMs;
    if(config.randomness.enabled) delay+=Math.round(delay*config.randomness.timingNoise*config.randomness.amount*Math.random());
    if(System.currentTimeMillis()-lastAction>=delay){lastAction=System.currentTimeMillis();if(mining.mine(c,target)){history.add(target,config.advanced.historySize);telemetry.blocksBroken++;target=null;state.set(State.RECOVERING);}}
    telemetry.attackHeld=mining.active(target); telemetry.targetAgeMs=target==null?0:System.currentTimeMillis()-lastAction;
  }
  private void updateTelemetry(MinecraftClient c){if(area!=null){telemetry.corridor=area.corridor()+1;telemetry.corridorCount=area.corridorCount();telemetry.areaPhase=area.phase().name();}else{telemetry.corridor=0;telemetry.corridorCount=0;telemetry.areaPhase="NONE";}telemetry.activeSeconds=startedAt==0?0:(System.currentTimeMillis()-startedAt)/1000;telemetry.player=new Telemetry.Vec(c.player.getX(),c.player.getY(),c.player.getZ());telemetry.camera=new Telemetry.Cam(c.player.getYaw(),c.player.getPitch());telemetry.speed=c.player.getVelocity().horizontalLength();telemetry.history=history.snapshot().stream().map(p->{String id=Registries.BLOCK.getId(c.world.getBlockState(p).getBlock()).toString();return new Telemetry.Target(id,new Telemetry.Vec(p.getX(),p.getY(),p.getZ()),c.player.getPos().distanceTo(Vec3d.ofCenter(p)));}).toList();if(target!=null){String id=Registries.BLOCK.getId(c.world.getBlockState(target).getBlock()).toString();telemetry.target=new Telemetry.Target(id,new Telemetry.Vec(target.getX(),target.getY(),target.getZ()),c.player.getPos().distanceTo(Vec3d.ofCenter(target)));}else telemetry.target=null;}
  private void release(MinecraftClient c){movement.release(c);mining.release(c);jump.release(c);} public void renderHud(DrawContext ctx){if(hudVisible)hud.render(ctx,config,telemetry);} public void toggleHud(){hudVisible=!hudVisible;}
  public Telemetry telemetry(){return telemetry;} public AutoMinerConfig config(){return config;} public void replaceConfig(AutoMinerConfig next){next.validate();config=next;hudVisible=next.advanced.hud;configs.save(next);}
  public void command(String cmd){var c=MinecraftClient.getInstance();c.execute(()->{switch(cmd){case"start"->start(c);case"pause"->pause(c);case"resume"->resume(c);case"stop"->stop(c);case"reload"->reload();default->throw new IllegalArgumentException("Comando inválido");}});}
  @Override public void close(){if(api!=null)api.close();release(MinecraftClient.getInstance());}
}
