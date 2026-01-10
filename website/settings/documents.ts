import { Paths } from "@/lib/pageroutes"

export const Documents: Paths[] = [
  {
    heading: "Getting Started",
    title: "Introduction",
    href: "/introduction",
    items: [
      {
        title: "Requirements",
        href: "/requirements",
      },
      {
        title: "Installation",
        href: "/installation",
      },
      {
        title: "Configuration",
        href: "/configuration",
      },
    ],
  },
  {
    spacer: true,
  },
  {
    title: "Features",
    href: "/features",
    heading: "Usage",
    items: [
      {
        title: "Status Icons",
        href: "/status-icons",
      },
      {
        title: "Gesture Controls",
        href: "/gesture-controls",
      },
      {
        title: "Multi-Instance",
        href: "/multi-instance",
      },
    ],
  },
  {
    spacer: true,
  },
  {
    title: "Terminal Integration",
    href: "/terminal-integration",
    heading: "Advanced",
    items: [
      {
        title: "Kitty Terminal",
        href: "/kitty-terminal",
      },
    ],
  },
  {
    title: "Architecture",
    href: "/architecture",
  },
  {
    title: "Troubleshooting",
    href: "/troubleshooting",
  },
]
