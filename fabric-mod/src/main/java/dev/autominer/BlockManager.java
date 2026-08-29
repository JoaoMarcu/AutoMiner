package dev.autominer;
import net.minecraft.registry.Registries;import net.minecraft.util.Identifier;
public final class BlockManager {public boolean validId(String id){try{return Registries.BLOCK.containsId(Identifier.of(id));}catch(Exception e){return false;}}}
