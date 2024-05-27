

#include "./UnityResolve.hpp"

std::unordered_map<std::string, void*> UnityResolve::address_ = {};
Il2CppDomain* UnityResolve::pDomain_=nullptr;
Il2CppThread* UnityResolve::pThread_=nullptr;
std::vector<UnityResolve::Assembly*> UnityResolve::assembly_;
