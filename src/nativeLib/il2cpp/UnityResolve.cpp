

#include "./UnityResolve.hpp"

std::unordered_map<std::string, void*> UnityResolve::address_ = {};
Il2CppDomain* UnityResolve::pDomain_=nullptr;
Il2CppThread* UnityResolve::pThread_=nullptr;
std::vector<UnityResolve::Assembly*> UnityResolve::assembly_;

void listAllGameObjects()
{
    auto* pClassGameObject = UnityResolve::Get("UnityEngine.CoreModule.dll")->Get("GameObject");
    typedef UnityResolve::UnityType::GameObject *T;
    auto objects = pClassGameObject->FindObjectsByType<UnityResolve::UnityType::GameObject *>();
    for (auto &obj : objects)
    {
        auto *p = obj->m_CachedPtr;
        LOG_INFOS("game name %s %p", obj->GetName().c_str(), p);
        if (p)
        {
            auto *clz = (Il2CppClass *)(obj->Il2CppClass.klass);
            if (clz)
            {
                LOG_INFOS(" clz name %s", il2cpp_class_get_name(clz));
            }
        }
    }
    LOG_INFOS("arra length %d", objects.size());
}