import { Box, Flex, HStack, IconButton, Text, VStack } from "@chakra-ui/react"
import { LuLibrary, LuMusic, LuSettings, LuWandSparkles } from "react-icons/lu"
import { Link, useLocation } from "react-router-dom"
import { ColorModeButton } from "@/components/ui/color-mode"

const navItems = [
  { path: "/", label: "Generator", icon: LuWandSparkles },
  { path: "/library", label: "Library", icon: LuLibrary },
  { path: "/settings", label: "Settings", icon: LuSettings },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

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
              const isActive = location.pathname === item.path
              return (
                <Box
                  key={item.path}
                  as={Link}
                  to={item.path}
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
                >
                  <Box as={item.icon} boxSize="5" />
                  <Text display={{ base: "none", md: "block" }}>{item.label}</Text>
                </Box>
              )
            })}
          </VStack>

          <Box px="1" display="flex" justifyContent={{ base: "center", md: "flex-start" }}>
            <ColorModeButton />
          </Box>
        </VStack>
      </Box>

      <Box flex="1" overflow="auto">
        <Box maxW="6xl" mx="auto" p={{ base: "4", md: "8" }}>
          {children}
        </Box>
      </Box>
    </Flex>
  )
}
