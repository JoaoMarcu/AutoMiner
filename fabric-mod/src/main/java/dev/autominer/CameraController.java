package dev.autominer;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.util.math.*;
public final class CameraController {
  public static float wrap(float angle){ return MathHelper.wrapDegrees(angle); }
  public boolean aim(ClientPlayerEntity player,BlockPos target,AutoMinerConfig.Camera cfg){
    Vec3d d=Vec3d.ofCenter(target).subtract(player.getEyePos()); double horizontal=Math.sqrt(d.x*d.x+d.z*d.z);
    float yaw=(float)Math.toDegrees(Math.atan2(-d.x,d.z)), pitch=(float)-Math.toDegrees(Math.atan2(d.y,horizontal));
    float dy=MathHelper.clamp(wrap(yaw-player.getYaw()),-cfg.yawSpeed,cfg.yawSpeed), dp=MathHelper.clamp(pitch-player.getPitch(),-cfg.pitchSpeed,cfg.pitchSpeed);
    player.setYaw(player.getYaw()+dy*(1-cfg.smoothing)); player.setPitch(MathHelper.clamp(player.getPitch()+dp*(1-cfg.smoothing),-90,90));
    return Math.abs(wrap(yaw-player.getYaw()))<2.5f && Math.abs(pitch-player.getPitch())<2.5f;
  }
  public void returnTo(ClientPlayerEntity player,float baseYaw,AutoMinerConfig.Camera cfg){ float d=MathHelper.clamp(wrap(baseYaw-player.getYaw()),-cfg.yawSpeed,cfg.yawSpeed);player.setYaw(player.getYaw()+d*(1-cfg.smoothing)); }
}
