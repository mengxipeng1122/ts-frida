#pragma once

namespace IL2CPP
{
	namespace Domain
	{
		Il2CppDomain* Get()
		{
			//return reinterpret_cast<void*(IL2CPP_CALLING_CONVENTION)()>(Functions.m_DomainGet)();
            return il2cpp_domain_get();
		}

		Unity::il2cppAssembly** GetAssemblies(size_t* m_Size)
		{
			//return reinterpret_cast<Unity::il2cppAssembly**(IL2CPP_CALLING_CONVENTION)(void*, size_t*)>(Functions.m_DomainGetAssemblies)(Get(), m_Size);
            return (Unity::il2cppAssembly**)il2cpp_domain_get_assemblies(Get(), m_Size);
		}
	}
}
