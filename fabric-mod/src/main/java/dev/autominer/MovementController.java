package dev.autominer;
import net.minecraft.client.MinecraftClient;
public final class MovementController {
  public void apply(MinecraftClient client,boolean sprint){ if(client.player==null)return; client.options.forwardKey.setPressed(true); client.options.sprintKey.setPressed(sprint); client.options.backKey.setPressed(false); client.options.leftKey.setPressed(false); client.options.rightKey.setPressed(false); }
  public void release(MinecraftClient client){ client.options.forwardKey.setPressed(false);client.options.sprintKey.setPressed(false);client.options.backKey.setPressed(false);client.options.leftKey.setPressed(false);client.options.rightKey.setPressed(false);client.options.jumpKey.setPressed(false);client.options.attackKey.setPressed(false); }
}
