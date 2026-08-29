package dev.autominer;
import net.minecraft.client.MinecraftClient;import net.minecraft.util.math.BlockPos;
public final class JumpController {private long last;public void tick(MinecraftClient c,BlockPos target,AutoMinerConfig cfg){if(c.player==null||!cfg.mining.autoJump)return;long now=System.currentTimeMillis();boolean jump=target.getY()>c.player.getBlockY()&&c.player.isOnGround()&&now-last>=cfg.mining.jumpCooldownMs;c.options.jumpKey.setPressed(jump);if(jump)last=now;}public void release(MinecraftClient c){c.options.jumpKey.setPressed(false);}}
