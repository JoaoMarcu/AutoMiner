package dev.autominer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.registry.Registries;
import net.minecraft.util.math.*;
import java.util.*;
public final class TargetSelector {
  public BlockPos select(MinecraftClient c,AutoMinerConfig cfg,TargetHistory history,float baseYaw){
    if(c.player==null||c.world==null)return null; Vec3d origin=c.player.getPos(); Vec3d forward=Vec3d.fromPolar(0,baseYaw); BlockPos best=null;double bestScore=-1e9;
    for(BlockPos p:BlockPos.iterateOutwards(c.player.getBlockPos(),cfg.movement.searchDistance,cfg.movement.verticalUp+cfg.movement.verticalDown,cfg.movement.searchDistance)){
      if(!c.world.isChunkLoaded(p)||p.getY()-origin.y>cfg.movement.verticalUp||origin.y-p.getY()>cfg.movement.verticalDown)continue;
      Vec3d d=Vec3d.ofCenter(p).subtract(origin);double front=d.x*forward.x+d.z*forward.z;if(front<=0||d.length()>cfg.movement.searchDistance)continue;
      double horizontal=Math.sqrt(d.x*d.x+d.z*d.z); float yaw=(float)Math.toDegrees(Math.atan2(-d.x,d.z)); float pitch=(float)-Math.toDegrees(Math.atan2(d.y,horizontal));
      if(Math.abs(CameraController.wrap(yaw-baseYaw))>cfg.camera.horizontalLimit||Math.abs(pitch)>cfg.camera.verticalLimit)continue;
      double lateral=Math.abs(d.x*forward.z-d.z*forward.x);if(lateral>cfg.movement.lateralRange)continue;
      String id=Registries.BLOCK.getId(c.world.getBlockState(p).getBlock()).toString();boolean enabled=cfg.enabledBlocks.stream().anyMatch(r->r.enabled()&&r.id().equals(id));if(!enabled)continue;
      double score=-front-lateral*2-Math.abs(d.y)-(history.contains(p)?cfg.randomness.historyPenalty:0)+(cfg.randomness.enabled?Math.random()*cfg.randomness.targetNoise:0);
      if(score>bestScore){bestScore=score;best=p.toImmutable();}
    } return best;
  }
}
