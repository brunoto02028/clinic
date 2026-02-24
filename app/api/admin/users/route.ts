import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_USERS, devFallbackResponse } from "@/lib/dev-fallback";

export async function GET(request: NextRequest) {
  try {
    const { clinicId, userRole } = await getClinicContext();

    if (
      !userRole ||
      (userRole !== "ADMIN" && userRole !== "THERAPIST" && userRole !== "SUPERADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const search = searchParams.get("search") || "";
    const letter = searchParams.get("letter") || "";
    const limit = parseInt(searchParams.get("limit") || "500");

    const where: any = withClinicFilter({}, clinicId);

    // Role filter
    if (roleFilter) {
      where.role = roleFilter;
    }

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Letter filter (first letter of firstName)
    if (letter && letter.length === 1) {
      where.firstName = { startsWith: letter, mode: "insensitive" };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        clinicId: true,
        canManageUsers: true,
        canManageAppointments: true,
        canManageArticles: true,
        canManageSettings: true,
        canViewAllPatients: true,
        canCreateClinicalNotes: true,
        createdAt: true,
        _count: {
          select: {
            patientAppointments: true,
            soapNotesFor: true,
          },
        },
      },
      orderBy: roleFilter === "PATIENT" ? { firstName: "asc" } : { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_USERS);
    }
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Create new staff member
export async function POST(request: NextRequest) {
  try {
    const { clinicId, userRole } = await getClinicContext();

    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      targetClinicId, // Allows SUPERADMIN to specify clinic
      canManageUsers,
      canManageAppointments,
      canManageArticles,
      canManageSettings,
      canViewAllPatients,
      canCreateClinicalNotes,
    } = body;

    const finalClinicId = userRole === "SUPERADMIN" ? targetClinicId : clinicId;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, password, first name and last name are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: role || "THERAPIST",
        clinicId: finalClinicId,
        canManageUsers: canManageUsers ?? false,
        canManageAppointments: canManageAppointments ?? true,
        canManageArticles: canManageArticles ?? false,
        canManageSettings: canManageSettings ?? false,
        canViewAllPatients: canViewAllPatients ?? true,
        canCreateClinicalNotes: canCreateClinicalNotes ?? true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        canManageUsers: true,
        canManageAppointments: true,
        canManageArticles: true,
        canManageSettings: true,
        canViewAllPatients: true,
        canCreateClinicalNotes: true,
        createdAt: true,
      },
    });

    // Send bilingual email notification to the new staff member
    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      // Detect language from request header or default to EN
      const acceptLang = request.headers.get('accept-language') || '';
      const isPt = acceptLang.includes('pt');

      const permissionsList = [
        canManageUsers ? (isPt ? '✓ Gerenciar Utilizadores' : '✓ Manage Users') : '',
        canManageAppointments ? (isPt ? '✓ Gerenciar Consultas' : '✓ Manage Appointments') : '',
        canManageArticles ? (isPt ? '✓ Gerenciar Artigos' : '✓ Manage Articles') : '',
        canManageSettings ? (isPt ? '✓ Gerenciar Configurações' : '✓ Manage Settings') : '',
        canViewAllPatients ? (isPt ? '✓ Ver Todos os Pacientes' : '✓ View All Patients') : '',
        canCreateClinicalNotes ? (isPt ? '✓ Criar Notas Clínicas' : '✓ Create Clinical Notes') : '',
      ].filter(Boolean).map(p => `<li>${p}</li>`).join('');

      const roleLabel = role === 'THERAPIST' ? (isPt ? 'Terapeuta' : 'Therapist') : (isPt ? 'Administrador' : 'Admin');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #607d7d 0%, #5dc9c0 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">${isPt ? 'Bem-vindo à Equipe!' : 'Welcome to the Team!'}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #607d7d; margin-top: 0;">${isPt ? `Olá, ${firstName}!` : `Hello ${firstName}!`}</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              ${isPt
                ? `Um administrador criou uma conta de <strong>${roleLabel}</strong> para você na Bruno Physical Rehabilitation.`
                : `An admin has created a <strong>${roleLabel}</strong> account for you at Bruno Physical Rehabilitation.`}
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5dc9c0;">
              <h3 style="margin-top: 0; color: #607d7d;">${isPt ? 'Credenciais de Acesso' : 'Your Login Credentials'}</h3>
              <p style="margin: 10px 0;"><strong>${isPt ? 'E-mail' : 'Email'}:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>${isPt ? 'Senha Temporária' : 'Temporary Password'}:</strong> ${password}</p>
              <p style="margin: 10px 0;"><strong>${isPt ? 'Função' : 'Role'}:</strong> ${roleLabel}</p>
            </div>
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ ${isPt ? 'Importante' : 'Important'}:</strong> ${isPt ? 'Altere sua senha após o primeiro login por segurança.' : 'Please change your password after your first login for security.'}
              </p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/staff-login" style="background: #5dc9c0; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ${isPt ? 'Acessar Portal da Equipe' : 'Log In to Staff Portal'}
              </a>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 14px; margin: 5px 0;"><strong>${isPt ? 'Suas Permissões' : 'Your Permissions'}:</strong></p>
              <ul style="color: #666; font-size: 14px;">${permissionsList}</ul>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: isPt
          ? `Sua conta de ${roleLabel} - Bruno Physical Rehabilitation`
          : `Your ${roleLabel} Account - Bruno Physical Rehabilitation`,
        html: htmlBody,
      });
    } catch (emailError) {
      console.error('Failed to send staff welcome email:', emailError);
      // Don't fail the creation if email fails
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}
