package dev.autominer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.registry.Registries;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.math.*;
public final class MiningController {
  public boolean valid(MinecraftClient c,BlockPos pos,AutoMinerConfig cfg){if(c.player==null||c.world==null||!c.world.isChunkLoaded(pos)||c.player.squaredDistanceTo(Vec3d.ofCenter(pos))>36)return false;String id=Registries.BLOCK.getId(c.world.getBlockState(pos).getBlock()).toString();return cfg.enabledBlocks.stream().anyMatch(r->r.enabled()&&r.id().equals(id));}
  public boolean mine(MinecraftClient c,BlockPos pos){if(c.player==null||c.interactionManager==null)return false;var hit=new BlockHitResult(Vec3d.ofCenter(pos),Direction.UP,pos,false);c.options.attackKey.setPressed(true);c.interactionManager.attackBlock(pos,hit.getSide());c.player.swingHand(c.player.getActiveHand());return c.world!=null&&c.world.getBlockState(pos).isAir();}
  public void release(MinecraftClient c){c.options.attackKey.setPressed(false);}
}
