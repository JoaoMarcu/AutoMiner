package dev.autominer;
import net.minecraft.client.MinecraftClient;
public final class InputManager {private final MovementController movement=new MovementController();public void releaseAll(MinecraftClient client){movement.release(client);}}
