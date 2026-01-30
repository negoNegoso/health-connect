import { useLocation } from "react-router-dom";
import { Heart, Users, Calendar, FileText, ClipboardList, Map, LogOut, Home, MessageSquare, PieChart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const menuItems = {
  doctor: [
    { title: "Início", url: "/", icon: Home },
    { title: "Pacientes", url: "/patients", icon: Users },
    { title: "Consultas", url: "/appointments", icon: Calendar },
    { title: "Prontuários", url: "/records", icon: FileText },
    { title: "Comunicação", url: "/communication", icon: MessageSquare },
  ],
  nurse: [
    { title: "Início", url: "/", icon: Home },
    { title: "Pacientes", url: "/patients", icon: Users },
    { title: "Consultas", url: "/appointments", icon: Calendar },
    { title: "Busca Ativa", url: "/busca-ativa", icon: ClipboardList },
    { title: "Comunicação", url: "/communication", icon: MessageSquare },
  ],
  agent: [
    { title: "Início", url: "/", icon: Home },
    { title: "Minha Área", url: "/territory", icon: Map },
    { title: "Comunicação", url: "/communication", icon: MessageSquare },
  ],
  director: [
    { title: "Início", url: "/", icon: Home },
    { title: "Painel Analítico", url: "/director-dashboard", icon: PieChart },
    { title: "Comunicação", url: "/communication", icon: MessageSquare },
  ],
};

const roleLabels = {
  doctor: "Médico(a)",
  nurse: "Enfermeiro(a)",
  agent: "Agente de Saúde",
  director: "Diretor(a) de Saúde",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, profile, signOut } = useAuth();

  const items = role ? menuItems[role] : [];
  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg shrink-0">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground">SOUDE</span>
              <span className="text-xs text-muted-foreground">Acompanhamento Médico</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        {profile && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium text-foreground truncate">
                  {profile.full_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {role && roleLabels[role]}
                </span>
              </div>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size={collapsed ? "icon" : "default"}
          className="w-full"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
