import { useTranslation } from 'react-i18next'
import { Form, Link, NavLink, useFetcher, useMatches } from 'react-router'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@course-anchor/ui/components/avatar'
import { Button } from '@course-anchor/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@course-anchor/ui/components/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  sidebarMenuButtonVariants,
  SidebarMenuItem,
  useSidebar,
} from '@course-anchor/ui/components/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@course-anchor/ui/components/tooltip'
import { cn } from '@course-anchor/ui/lib/utils'
import { type VariantProps } from 'class-variance-authority'
import {
  ArchiveX,
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  Command,
  CreditCard,
  File,
  Inbox,
  Languages,
  LogOut,
  Paintbrush,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { z } from 'zod'
import { useRequestInfo } from '~/lib/request-info'
import { useOptionalUser, useUser } from '~/lib/user'
import { LanguageDropdown } from '~/routes/resources/locales'
import { ThemeDropdown } from '~/routes/resources/theme-switch'
import { getUserImgSrc } from '../lib/misc'

export const SidebarHandle = z.object({
  sidebar: z.enum(['settings', 'users', 'default']),
})
export type SidebarHandle = z.infer<typeof SidebarHandle>

const SidebarHandleMatch = z.object({
  handle: SidebarHandle,
})

const useSidebarMatches = () => {
  const matches = useMatches()
  const sidebarMatch = matches
    .map(m => {
      const result = SidebarHandleMatch.safeParse(m)
      if (!result.success || !result.data.handle.sidebar) return null
      return result.data
    })
    .filter(Boolean)
    .at(-1)
  return sidebarMatch?.handle?.sidebar ?? 'default'
}

const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings,
    },
    {
      title: 'Users',
      url: '/',
      icon: User,
    },
    {
      title: 'Sent',
      url: '#',
      icon: Send,
    },
    {
      title: 'Junk',
      url: '#',
      icon: ArchiveX,
    },
    {
      title: 'Trash',
      url: '#',
      icon: Trash2,
    },
  ],
  navSub: {
    settings: [
      { title: 'Profile', url: '/settings' },
      { title: 'Connections', url: '/settings/connections' },
    ],
    users: [{ title: 'Team', url: '/' }],
  },
  mails: [
    {
      name: 'William Smith',
      email: 'williamsmith@example.com',
      subject: 'Meeting Tomorrow',
      date: '09:34 AM',
      teaser:
        'Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates.',
    },
    {
      name: 'Alice Smith',
      email: 'alicesmith@example.com',
      subject: 'Re: Project Update',
      date: 'Yesterday',
      teaser:
        "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps.",
    },
    {
      name: 'Bob Johnson',
      email: 'bobjohnson@example.com',
      subject: 'Weekend Plans',
      date: '2 days ago',
      teaser:
        "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?",
    },
    {
      name: 'Emily Davis',
      email: 'emilydavis@example.com',
      subject: 'Re: Question about Budget',
      date: '2 days ago',
      teaser:
        "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?",
    },
    {
      name: 'Michael Wilson',
      email: 'michaelwilson@example.com',
      subject: 'Important Announcement',
      date: '1 week ago',
      teaser:
        "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future.",
    },
    {
      name: 'Sarah Brown',
      email: 'sarahbrown@example.com',
      subject: 'Re: Feedback on Proposal',
      date: '1 week ago',
      teaser:
        "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?",
    },
    {
      name: 'David Lee',
      email: 'davidlee@example.com',
      subject: 'New Project Idea',
      date: '1 week ago',
      teaser:
        "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?",
    },
    {
      name: 'Olivia Wilson',
      email: 'oliviawilson@example.com',
      subject: 'Vacation Plans',
      date: '1 week ago',
      teaser:
        "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave.",
    },
    {
      name: 'James Martin',
      email: 'jamesmartin@example.com',
      subject: 'Re: Conference Registration',
      date: '1 week ago',
      teaser:
        "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end.",
    },
    {
      name: 'Sophia White',
      email: 'sophiawhite@example.com',
      subject: 'Team Dinner',
      date: '1 week ago',
      teaser:
        "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.",
    },
  ],
}

function SidebarMenuLink({
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  inactiveClassName,
  ...props
}: React.ComponentProps<typeof NavLink> & {
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
  inactiveClassName?: string
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state } = useSidebar()
  const comp = !tooltip ? (
    <NavLink
      className={({ isActive }) =>
        cn(
          sidebarMenuButtonVariants({ variant, size, className }),
          !isActive && inactiveClassName
        )
      }
      {...props}
    />
  ) : (
    <TooltipTrigger
      render={
        <NavLink
          className={({ isActive }) =>
            cn(
              sidebarMenuButtonVariants({ variant, size, className }),
              !isActive && inactiveClassName
            )
          }
          {...props}
        />
      }
    />
  )

  if (!tooltip) {
    return comp
  }

  if (typeof tooltip === 'string') {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      {comp}
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SettingsSidebar() {
  return (
    <Sidebar collapsible="none" className="hidden flex-1 md:flex">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-base font-medium text-foreground">Settings</div>
          {/* <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label> */}
        </div>
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navSub.settings.map(sub => (
                <SidebarMenuItem key={sub.title}>
                  <SidebarMenuLink
                    to={sub.url}
                    className="px-2.5 md:px-2"
                    inactiveClassName="opacity-80"
                    end
                  >
                    {sub.title}
                  </SidebarMenuLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

function UserSidebar() {
  return (
    <Sidebar collapsible="none" className="hidden flex-1 md:flex">
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex w-full items-center justify-between">
          <div className="text-base font-medium text-foreground">User</div>
          {/* <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label> */}
        </div>
        <SidebarInput placeholder="Type to search..." />
      </SidebarHeader>
      <SidebarContent>
        {/* <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {data.mails.map(mail => (
                <a
                  href="#"
                  key={mail.email}
                  className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <div className="flex w-full items-center gap-2">
                    <span>{mail.name}</span>{' '}
                    <span className="ml-auto text-xs">{mail.date}</span>
                  </div>
                  <span className="font-medium">{mail.subject}</span>
                  <span className="line-clamp-2 w-65 text-xs whitespace-break-spaces">
                    {mail.teaser}
                  </span>
                </a>
              ))}
            </SidebarGroupContent>
          </SidebarGroup> */}
      </SidebarContent>
    </Sidebar>
  )
}

function NavUser() {
  const { isMobile } = useSidebar()
  const user = useUser()
  const requestInfo = useRequestInfo()
  const { t } = useTranslation()

  const logout = useFetcher()

  const handleLogout = () => {
    logout.submit(null, { method: 'post', action: '/logout' })
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={getUserImgSrc(user.image?.objectKey)}
                alt={user.name ?? user.username}
              />
              <AvatarFallback className="rounded-lg">
                {user.name?.[0] ?? user.username?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.username}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={getUserImgSrc(user.image?.objectKey)}
                      alt={user.name ?? user.username}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user.name?.[0] ?? user.username?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.username}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                {t('appSidebar.upgrade')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/settings" />}>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Paintbrush />
                  {t('appSidebar.theme')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <ThemeDropdown userPreference={requestInfo.userPrefs.theme} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages />
                  {t('appSidebar.language')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <LanguageDropdown
                    userPreference={requestInfo.userPrefs.locale}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleLogout()}>
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpen } = useSidebar()
  const mode = useSidebarMatches()
  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuLink to={'#'} size="lg" className="md:h-8 md:p-0">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </SidebarMenuLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuLink
                      to={item.url}
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setOpen(true)
                      }}
                      className={'px-2.5 md:px-2'}
                      inactiveClassName="opacity-80"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
          {/* <ThemeDropdown /> */}
        </SidebarFooter>
      </Sidebar>
      {mode
        ? (() => {
            switch (mode) {
              case 'settings':
                return <SettingsSidebar />
              case 'users':
                return <UserSidebar />
              default:
                return null
            }
          })()
        : null}
    </Sidebar>
  )
}
