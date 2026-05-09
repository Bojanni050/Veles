"use client"

import { Box, Flex, HStack, Link, Text, VStack } from "@chakra-ui/react"
import NextLink from "next/link"
import { LuLibrary, LuMusic, LuSettings, LuWandSparkles } from "react-icons/lu"
import { usePathname } from "next/navigation"
import { ColorModeButton } from "@/components/ui/color-mode"
import { AudioPlayer } from "@/components/AudioPlayer"
import { usePlayer } from "@/lib/player-context"

const navItems = [
  { path: "/", label: "Generator", icon: LuWandSparkles },
  { path: "/library", label: "Library", icon: LuLibrary },
  { path: "/settings", label: "Settings", icon: LuSettings },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { currentSong, queue, setCurrentSong } = usePlayer()

  return (
    <Flex minH="100vh" bg="bg">
      <Box
        as="nav"
        w={{ base: "70px", md: "220px" }}
        borderRightWidth="1px"
        borderColor="border.muted"
        bg="bg.subtle"
        py="6"
        px={{ base: "2", md: "4" }}
        position="sticky"
        top="0"
        h="100vh"
      >
        <VStack gap="8" align="stretch" h="full">
          <HStack gap="2" justify={{ base: "center", md: "flex-start" }} px="2">
            <Box as={LuMusic} boxSize="6" color="teal.400" />
            <Text
              fontWeight="bold"
              fontSize="xl"
              display={{ base: "none", md: "block" }}
              color="fg"
            >
              Veles
            </Text>
          </HStack>

          <VStack gap="1" align="stretch" flex="1">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.path}
                  as={NextLink}
                  href={item.path}
                  display="flex"
                  alignItems="center"
                  gap="3"
                  px="3"
                  py="2.5"
                  rounded="lg"
                  fontWeight="medium"
                  fontSize="sm"
                  color={isActive ? "teal.300" : "fg.muted"}
                  bg={isActive ? "teal.500/10" : "transparent"}
                  _hover={{ bg: isActive ? "teal.500/10" : "bg.muted", color: isActive ? "teal.300" : "fg" }}
                  transition="backgrounds"
                  transitionDuration="fast"
                  justifyContent={{ base: "center", md: "flex-start" }}
                  textDecoration="none"
                  _focusVisible={{ boxShadow: "none" }}
                >
                  <Box as={item.icon} boxSize="5" />
                  <Text display={{ base: "none", md: "block" }}>{item.label}</Text>
                </Link>
              )
            })}
          </VStack>

          <Box px="1" display="flex" justifyContent={{ base: "center", md: "flex-start" }}>
            <ColorModeButton />
          </Box>
        </VStack>
      </Box>

      <Box flex="1" overflow="auto">
        <Box maxW="6xl" mx="auto" p={{ base: "4", md: "8" }} pb={{ base: "24", md: "28" }}>
          {children}
        </Box>
      </Box>

      <AudioPlayer
        song={currentSong}
        songs={queue}
        onSongChange={setCurrentSong}
      />
    </Flex>
  )
}
