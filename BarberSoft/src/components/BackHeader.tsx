// src/components/BackHeader.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../theme";

interface BackHeaderProps {
  titulo: string;
  subtitulo?: string;
  /** Rota nomeada para voltar (padrão: goBack()) */
  destino?: string;
  /** Componente ou botão no lado direito */
  direita?: React.ReactNode;
}

export const BackHeader: React.FC<BackHeaderProps> = ({
  titulo, subtitulo, destino, direita,
}) => {
  const navigation = useNavigation<any>();

  const handleVoltar = () => {
    if (destino) {
      navigation.navigate(destino);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // fallback: tenta voltar para a primeira aba
      navigation.navigate("Home");
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={handleVoltar}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={1}>{titulo}</Text>
        {!!subtitulo && (
          <Text style={styles.subtitulo} numberOfLines={1}>{subtitulo}</Text>
        )}
      </View>

      {direita ? (
        <View style={styles.direita}>{direita}</View>
      ) : (
        // placeholder para manter o título centralizado
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.gold,
    lineHeight: 28,
    marginTop: -2,
  },
  info: {
    flex: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
  },
  subtitulo: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  direita: {
    flexShrink: 0,
  },
  placeholder: {
    width: 34,
    flexShrink: 0,
  },
});
