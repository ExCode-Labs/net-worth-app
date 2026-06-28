/**
 * Sheet — @gorhom/bottom-sheet wrapper themed to the cosmic dark palette.
 * Replaces the old Modal-based BottomSheet.
 *
 * Usage:
 *   <Sheet visible={open} onClose={() => setOpen(false)}>
 *     {content}
 *   </Sheet>
 *
 *   <Sheet visible={open} onClose={close} snapPoints={["80%"]} scrollable>
 *     <SheetFlatList data={...} renderItem={...} />
 *   </Sheet>
 */
import React, { useRef, useEffect, useCallback } from "react";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { C } from "@/constants/theme";

// Re-export gorhom list/scroll containers for use inside Sheet.
export { BottomSheetFlatList as SheetFlatList } from "@gorhom/bottom-sheet";
export { BottomSheetScrollView as SheetScrollView } from "@gorhom/bottom-sheet";

const BG = "#0d1225";

export function Sheet({
  visible,
  onClose,
  snapPoints,
  keyboardAware = false,
  children,
}: {
  visible:        boolean;
  onClose:        () => void;
  snapPoints?:    (string | number)[];
  /** Set true when the sheet contains text inputs so the keyboard doesn't cover them. */
  keyboardAware?: boolean;
  children:       React.ReactNode;
}) {
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.65}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior={keyboardAware ? "interactive" : "fillParent"}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode={keyboardAware ? "adjustResize" : "adjustPan"}
      handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.18)", width: 40, height: 4 }}
      backgroundStyle={{
        backgroundColor: BG,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderTopColor: C.border,
      }}
    >
      <BottomSheetView>{children}</BottomSheetView>
    </BottomSheetModal>
  );
}
