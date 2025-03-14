import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import DraggableFlatList, {
  DragEndParams,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useTheme } from 'react-native-paper';

interface DraggableListProps<T> {
  data: T[];
  onDragEnd: (params: { data: T[]; from: number; to: number }) => void;
  renderItem: (params: { item: T; drag: () => void; isActive: boolean }) => JSX.Element;
  keyExtractor: (item: T) => string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  ListEmptyComponent?: React.ReactNode;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
}

export function DraggableList<T>({
  data,
  onDragEnd,
  renderItem,
  keyExtractor,
  style,
  contentContainerStyle,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
}: DraggableListProps<T>) {
  const theme = useTheme();

  const handleDragEnd = ({ data: newData, from, to }: DragEndParams<T>) => {
    onDragEnd({ data: newData, from, to });
  };

  const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<T>) => {
    const content = renderItem({ item, drag, isActive });
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.itemContainer,
            {
              backgroundColor: isActive ? theme.colors.surfaceVariant : theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          {content}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <DraggableFlatList
      data={data}
      onDragEnd={handleDragEnd}
      keyExtractor={keyExtractor}
      renderItem={renderDraggableItem}
      style={style}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  itemContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
  },
});