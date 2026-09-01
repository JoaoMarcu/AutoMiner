package dev.autominer;
import net.minecraft.client.MinecraftClient;
import net.minecraft.registry.Registries;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.math.*;
public final class MiningController {
  public boolean valid(MinecraftClient c,BlockPos pos,AutoMinerConfig cfg){if(c.player==null||c.world==null||!c.world.isChunkLoaded(pos)||c.player.squaredDistanceTo(Vec3d.ofCenter(pos))>36)return false;String id=Registries.BLOCK.getId(c.world.getBlockState(pos).getBlock()).toString();return cfg.enabledBlocks.stream().anyMatch(r->r.enabled()&&r.id().equals(id));}
  private BlockPos held;
  private long startedAt;
  public boolean mine(MinecraftClient c,BlockPos pos){if(c.player==null||c.interactionManager==null||c.world==null)return false;if(!pos.equals(held)){release(c);held=pos.toImmutable();startedAt=System.currentTimeMillis();}c.options.attackKey.setPressed(true);c.interactionManager.updateBlockBreakingProgress(pos,Direction.UP);if(System.currentTimeMillis()-startedAt<100)return false;return c.world.getBlockState(pos).isAir();}
  public boolean active(BlockPos pos){return pos!=null&&held!=null&&held.equals(pos);}
  public void release(MinecraftClient c){c.options.attackKey.setPressed(false);if(c.interactionManager!=null&&held!=null)c.interactionManager.cancelBlockBreaking();held=null;startedAt=0;}
}
