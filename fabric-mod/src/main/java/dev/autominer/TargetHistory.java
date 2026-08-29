package dev.autominer;
import net.minecraft.util.math.BlockPos;
import java.util.*;
public final class TargetHistory {
  private final Deque<BlockPos> positions=new ArrayDeque<>();
  public void add(BlockPos pos,int limit){ positions.remove(pos); positions.addFirst(pos.toImmutable()); while(positions.size()>limit)positions.removeLast(); }
  public boolean contains(BlockPos pos){return positions.contains(pos);} public List<BlockPos> snapshot(){return List.copyOf(positions);}
}
