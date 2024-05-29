/*
 * Update: 2024-2-8 13:00
 * Source: https://github.com/issuimo/UnityResolve.hpp
 * Author: github@issuimo
 */

#pragma once
// only for Android now 

#include <fstream>
#include <sstream>
#include <iostream>
#include <mutex>
#include <iomanip>
#include <string>
#include <unordered_map>
#include <functional>
#include <vector>
#include <limits.h>
#include <codecvt>
#include <locale>
#include <dlfcn.h>

#define UNITY_CALLING_CONVENTION


#include "il2cpp-api-types.h"

#define DO_API(return_type, func, args) extern "C" return_type func args
#include "il2cpp-api-functions.h"
#undef DO_API

#include "utils.h"

#include "json.hpp"
#include <bitset>


struct UnityResolve final {

	struct Assembly;
	struct Type;
	struct Class;
	struct Field;
	struct Method;

	struct Assembly final {
		const Il2CppAssembly* address;
		std::string         name;
		std::string         file;
		std::vector<Class*> classes;
        
        nlohmann::json to_json() const {
            nlohmann::json j_classes = nlohmann::json::array();

            // Serialize each Class pointer in the classes vector.
            for (const auto& cls : classes) {
                // If not, you'll need to write the serialization logic here.
                j_classes.push_back(cls->to_json());
            }
            nlohmann::json j = {
                {"name", name},
                {"file", file},
                {"classes", j_classes},
            };
            return j;
        };


		[[nodiscard]] auto Get(const std::string& strClass, const std::string& strNamespace = "*", const std::string& strParent = "*") const -> Class* {
			for (const auto pClass : classes) if (strClass == pClass->name && (strNamespace == "*" || pClass->namespaze == strNamespace) && (strParent == "*" || pClass->parent == strParent)) return pClass;
			return nullptr;
		}
	};

	struct Type final {
		const Il2CppType* address;
		std::string name;
		int         size;

        nlohmann::json to_json() const {
            nlohmann::json j = {
                {"name", name},
                {"size", size},
            };
            return j;
        };


		[[nodiscard]] auto GetObject() const -> void* {
            return il2cpp_type_get_object( address);
		}
	};

	struct Class final {
		const Il2CppClass*         	classinfo;
		std::string          		name;
		std::string          		parent;
		std::string          		namespaze;
		std::vector<Field*>  		fields;
		std::vector<Method*> 		methods;
		void* objType;

        
        nlohmann::json to_json() const {

            nlohmann::json j_fields = nlohmann::json::array();
            for (const auto& f : fields) {
                j_fields.push_back(f->to_json());
            }

            nlohmann::json j_methods = nlohmann::json::array();
            for (const auto& m : methods) {
                j_methods.push_back(m->to_json());
            }

            nlohmann::json j = {
                {"name", name},
                {"parent", parent},
                {"namespace", namespaze},
                {"fields", j_fields},
                {"methods", j_methods},
                // {"objType", objType->to_json()},
            };
            return j;
        };


		template <typename RType>
		auto Get(const std::string& name, const std::vector<std::string>& args = {}) -> RType* {
			if (std::is_same<RType, Field>::value) {
                for (auto pField : fields) 
                    if (pField->name == name) 
                        return (RType*)(pField);
            }
			if (std::is_same<RType, std::int32_t>::value) 
            {
                for (const auto pField : fields) 
                    if (pField->name == name) 
                        return reinterpret_cast<RType*>(pField->offset);
            }
			if (std::is_same<RType, Method>::value) {
				for (auto pMethod : methods) {
					if (pMethod->name == name) {
						if (pMethod->args.size() == 0 && args.size() == 0) {
							return static_cast<RType*>(pMethod);
						}
						if (pMethod->args.size() == args.size()) {
							size_t index{ 0 };
                            size_t i{ 0};
                            for ( const auto & typeName : args) {
                                if (typeName == "*" || typeName.empty() ? true : pMethod->args[i++]->pType->name == typeName) {
                                    index++;
                                }
                            }
                            if (index == pMethod->args.size()) {
								return static_cast<RType*>(pMethod);
							}
						}
					}
				}

				for (auto pMethod : methods) {
					if (pMethod->name == name) {
						return static_cast<RType*>(pMethod);
					}
				}
			}
			return nullptr;
		}

        auto GetField(const std::string& name) -> Field* {
            for (auto pField : fields) 
                if (pField->name == name) 
                    return pField;
            return nullptr;
        }

		auto GetMethod(const std::string& name, const std::vector<std::string>& args = {}) -> Method* {
            for (auto pMethod : methods) {
                if (pMethod->name == name) {
                    if (pMethod->args.size() == 0 && args.size() == 0) {
                        return pMethod;
                    }
                    if (pMethod->args.size() == args.size()) {
                        size_t index{ 0 };
                        size_t i{ 0};
                        for ( const auto & typeName : args) {
                            if (typeName == "*" || typeName.empty() ? true : pMethod->args[i++]->pType->name == typeName) {
                                index++;
                            }
                        }
                        if (index == pMethod->args.size()) {
                            return pMethod;
                        }
                    }
                }
            }

            for (auto pMethod : methods) {
                if (pMethod->name == name) {
                    return pMethod;
                }
            }

            return nullptr;
        }

		template <typename RType>
		auto GetValue(void* obj, const std::string& name) -> RType { return *reinterpret_cast<RType*>(reinterpret_cast<uintptr_t>(obj) + Get<Field>(name)->offset); }

		template <typename RType>
		auto SetValue(void* obj, const std::string& name, RType value) -> void { return *reinterpret_cast<RType*>(reinterpret_cast<uintptr_t>(obj) + Get<Field>(name)->offset) = value; }

		[[nodiscard]] auto GetType() const -> Type {
            auto pUType =il2cpp_class_get_type((Il2CppClass*)classinfo);
            return { pUType, name, -1 };
        }

		/**
		 * \brief 获取类所有实例
		 * \tparam T 返回数组类型
		 * \param type 类
		 * \return 返回实例指针数组
		 */
		template <typename T>
		auto FindObjectsByType() -> std::vector<T> {
			static Method* pMethod;

			if (!pMethod) pMethod = UnityResolve::Get("UnityEngine.CoreModule.dll")->Get("Object")->Get<Method>( "FindObjectsOfType" , { "System.Type" });
			if (!objType) { objType = this->GetType().GetObject(); }

			if (pMethod && objType) {
				auto array = pMethod->Invoke<UnityType::Array<T>*>(objType);
				return array->ToVector();
			}

			return std::vector<T>();
		}

		template <typename T>
		auto New() -> T* {
			return il2cpp_object_new(classinfo);
		}
	};

	struct Field final {
		void* fieldinfo;
		std::string  name;
		Type* type;
		Class* klass;
		std::int32_t offset; // If offset is -1, then it's thread static
		bool         static_field;
		void* vTable;
        
        nlohmann::json to_json() const {

            nlohmann::json j = {
                {"name", name},
                {"type", type->to_json()},
                {"offset", offset},
                {"static_field", static_field},
//                {"vTable", vTable},
            };
            return j;
        };


		template <typename T>
		auto SetValue(T* value) const -> void {
			if (!static_field) return;
			return il2cpp_field_static_set_value( fieldinfo, value);
		}

		template <typename T>
		auto GetValue(T* value) const -> void {
			if (!static_field) return;
			return il2cpp_field_static_get_value( fieldinfo, value);
		}
	};

	struct Method final {
		const MethodInfo* 	address;
		std::string  		name;
		Class* 				klass;
		Type* 				return_type;
		std::int32_t 		flags;
		bool         		static_function;
		void* 				function;
        

		struct Arg {
			std::string name;
			Type* pType;
		};

		std::vector<Arg*> args;

		bool badPtr{ false };

        nlohmann::json to_json() const {

            nlohmann::json j_args = nlohmann::json::array();  // Create a json array for args

            // Iterate over the args vector and convert each Arg to json
            for (const Arg* arg : args) {
                if (arg != nullptr) { // Check if the pointer is not null
                    nlohmann::json j_arg = {
                        {"name", arg->name},
                        {"type", arg->pType ? arg->pType->to_json() : nullptr}  // Assuming Type has a to_json() method
                    };
                    j_args.push_back(j_arg);  // Add the Arg json to the args array
                } else {
                    j_args.push_back(nullptr);  // If arg is a null pointer, insert null into the JSON array
                }
            }

            // Create the main json object with all the class members
            nlohmann::json j = {
                {"name", name},
                {"return_type", return_type->to_json()},
                {"flags", flags},
                {"static_function", static_function},
                {"function", reinterpret_cast<uint64_t>(function)},
                {"args", j_args},  // Add the args json array
                {"badPtr", badPtr} // Add the badPtr boolean
            };

            return j;
        };

		template <typename Return, typename... Args>
		auto Invoke(Args... args) -> Return {
			if (function) return reinterpret_cast<Return(UNITY_CALLING_CONVENTION*)(Args...)>(function)(args...);
			return Return();
		}

        template<typename T, typename... Args>
        void SetArgArray(void** argArray, size_t& index, T& arg, Args&... rest) {
            argArray[index++] = static_cast<void*>(&arg);
            SetArgArray(argArray, index, rest...);
        }

        // Base case for the recursive function to end the recursion
        void SetArgArray(void** argArray, size_t& index) {
            // Do nothing, end of recursion
        }

		template <typename Return, typename Obj, typename... Args>
		auto RuntimeInvoke(Obj* obj, Args... args) -> Return {
			void* exc{};
			void* argArray[sizeof...(Args) + 1];
			if (sizeof...(Args) > 0) {
				size_t index = 0;
				// ((argArray[index++] = static_cast<void*>(&args)), ...);
                SetArgArray(argArray, index, args...);
			}

            if (std::is_same<Return, void>::value) {
                il2cpp_runtime_invoke( address, obj, argArray, exc);
                return;
            }
            else return *static_cast<Return*>(il2cpp_runtime_invoke( address, obj, argArray, exc));
		}

		template <typename Return, typename... Args>
		using MethodPointer = Return(UNITY_CALLING_CONVENTION*)(Args...);

		template <typename Return, typename... Args>
		auto Cast() -> MethodPointer<Return, Args...> {
			if (function) return static_cast<MethodPointer<Return, Args...>>(function);
            return Return();
			// throw std::logic_error("nullptr");
		}

		std::string prototype() const {
		    std::string prototype;

		    // Assuming Type has a getName() method to get a string representation of the type
		    prototype += return_type->name;
		    prototype += " ";
		    prototype += static_function ? "static " : "";
		    prototype += name;
		    prototype += "(";

		    for (size_t i = 0; i < args.size(); ++i) {
		        const Arg* arg = args[i];
		        if (arg != nullptr) {
		            prototype += arg->pType ? arg->pType->name : "void";
		            prototype += " ";
		            prototype += arg->name;
		            if (i < args.size() - 1) {
		                prototype += ", ";
		            }
		        }
		    }

		    prototype += ")";
		    return prototype;
		}


	};

	static auto ThreadAttach() -> void {
		il2cpp_thread_attach( pDomain_);
	}

	static auto ThreadDetach() -> void {
        if(pThread_) il2cpp_thread_detach( pThread_); // pThread
        pThread_ = nullptr;
	}

	static auto Init() -> void {
        pDomain_ = il2cpp_domain_get();
        pThread_ = il2cpp_thread_attach( pDomain_);
        ForeachAssembly();
	}

	static auto DumpToJson() -> nlohmann::json {
        nlohmann::json j_array = nlohmann::json::array();
        for (const auto& pAssembly : assembly_) {
            j_array.push_back(pAssembly->to_json());
        }
        return j_array;
    }

	static auto DumpToFile(const std::string& path) -> void {
        std::ofstream io(path + "dump.cs", std::fstream::out);
        if (!io) return;
    
        for (const auto& pAssembly : assembly_) {
            for (const auto& pClass : pAssembly->classes) {
                io << "\tnamespace: ";
                if (!pClass->namespaze.empty()) {
                    io << pClass->namespaze;
                }
                io << "\n";
    
                io << "\tAssembly: ";
                if (!pAssembly->name.empty()) {
                    io << pAssembly->name;
                }
                io << "\n";
    
                io << "\tAssemblyFile: ";
                if (!pAssembly->file.empty()) {
                    io << pAssembly->file;
                }
                io << "\n";
    
                io << "\tclass " << pClass->name;
                if (!pClass->parent.empty()) {
                    io << " : " << pClass->parent;
                }
                io << " {\n\n";
    
                for (const auto& pField : pClass->fields) {
                    io << "\t\t";
                    io << std::hex << std::showpos << std::internal << std::setfill('0');
                    io << std::setw(8) << pField->offset << " | ";
    
                    if (pField->static_field) {
                        io << "static ";
                    }
    
                    io << pField->type->name << " " << pField->name << ";\n";
                }
                io << "\n";
    
                for (const auto& pMethod : pClass->methods) {
                    io << "\t\t[Flags: ";
                    io << std::bitset<32>(pMethod->flags) << "] ";
                    io << "[ParamsCount: ";
                    io << std::setw(4) << std::dec << pMethod->args.size() << "] ";
                    io << "|RVA: ";
                    {
                        //io << std::showpos << std::internal << std::setfill('0');
                        std::string RVA = get_module_name_and_offset(pMethod->function);
                        io <<  RVA;
                    }
                    io << "|\n";
    
                    io << "\t\t";
                    if (pMethod->static_function) {
                        io << "static ";
                    }
                    io << pMethod->return_type->name << " " << pMethod->name << "(";
    
                    std::string params;
                    for (const auto& pArg : pMethod->args) {
                        params += pArg->pType->name + " " + pArg->name + ", ";
                    }
                    if (!params.empty()) {
                        params.pop_back();
                        params.pop_back();
                    }
                    io << params;
    
                    io << ");\n\n";
                }
    
                io << "\t}\n\n";
            }
        }
    
        io << '\n';
        io.close();
    
        std::ofstream io2(path + "struct.hpp", std::fstream::out);
        if (!io2) return;
    
        for (const auto& pAssembly : assembly_) {
            for (const auto& pClass : pAssembly->classes) {
                io2 << "\tnamespace: ";
                if (!pClass->namespaze.empty()) {
                    io2 << pClass->namespaze;
                }
                io2 << "\n";
    
                io2 << "\tAssembly: ";
                if (!pAssembly->name.empty()) {
                    io2 << pAssembly->name;
                }
                io2 << "\n";
    
                io2 << "\tAssemblyFile: ";
                if (!pAssembly->file.empty()) {
                    io2 << pAssembly->file;
                }
                io2 << "\n";
    
                io2 << "\tstruct " << pClass->name;
                if (!pClass->parent.empty()) {
                    io2 << " : " << pClass->parent;
                }
                io2 << " {\n\n";
    
                for (size_t i = 0; i < pClass->fields.size(); i++) {
                    if (pClass->fields[i]->static_field) {
                        continue;
                    }
    
                    auto field = pClass->fields[i];
    
                next:
                    if ((i + 1) >= pClass->fields.size()) {
                        io2 << "\t\tchar " << field->name << "[0x" << std::hex << std::setw(6) << 4 << "];\n";
                        continue;
                    }
    
                    if (pClass->fields[i + 1]->static_field) {
                        i++;
                        goto next;
                    }
    
                    std::string name = field->name;
                    std::replace(name.begin(), name.end(), '<', '_');
                    std::replace(name.begin(), name.end(), '>', '_');
    
                    if (field->type->name == "System.Int64") {
                        io2 << "\t\tstd::int64_t " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 8) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::setw(6) << pClass->fields[i + 1]->offset - field->offset - 8 << "];\n";
                        }
                        continue;
                    }
    
                    if (field->type->name == "System.UInt64") {
                        io2 << "\t\tstd::uint64_t " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 8) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::setw(6) << pClass->fields[i + 1]->offset - field->offset - 8 << "];\n";
                        }
                        continue;
                    }
    
                    if (field->type->name == "System.Int32") {
                        io2 << "\t\tint " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 4) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::setw(6) << pClass->fields[i + 1]->offset - field->offset - 4 << "];\n";
                        }
                        continue;
                    }
    
                    if (field->type->name == "System.UInt32") {
                        io2 << "\t\tstd::uint32_t " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 4) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::setw(6) << pClass->fields[i + 1]->offset - field->offset - 4 << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "System.Boolean") {
                        io2 << "\t\tbool " << name << ";\n";

                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 1) {
                            std::stringstream hexPadding;
                            hexPadding << std::hex << std::uppercase << std::setfill('0') << std::setw(6) << (pClass->fields[i + 1]->offset - field->offset - 1);
                            io2 << "\t\tchar " << name << "_[0x" << hexPadding.str() << "];\n";
                        }

                        continue;
                    }

                    if (field->type->name == "System.String") {
                        io2 << "\t\tUnityResolve::UnityType::String* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::uppercase << std::setfill('0') << std::setw(6) << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "System.Single") {
                        io2 << "\t\tfloat " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 4) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::uppercase << std::setfill('0') << std::setw(6) << (pClass->fields[i + 1]->offset - field->offset - 4) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "System.Double") {
                        io2 << "\t\tdouble " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > 8) {
                            io2 << "\t\tchar " << name << "_[0x" << std::hex << std::uppercase << std::setfill('0') << std::setw(6) << (pClass->fields[i + 1]->offset - field->offset - 8) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Vector3") {
                        io2 << "\t\tUnityResolve::UnityType::Vector3 " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Vector3)) {
                            std::stringstream buffer;
                            buffer << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Vector3));
                            io2 << "\t\tchar " << name << "_[0x" << buffer.str() << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Vector2") {
                        io2 << "\t\tUnityResolve::UnityType::Vector2 " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Vector2)) {
                            std::stringstream buffer;
                            buffer << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Vector2));
                            io2 << "\t\tchar " << name << "_[0x" << buffer.str() << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Vector4") {
                        io2 << "\t\tUnityResolve::UnityType::Vector4 " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Vector4)) {
                            std::stringstream buffer;
                            buffer << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Vector4));
                            io2 << "\t\tchar " << name << "_[0x" << buffer.str() << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.GameObject") {
                        io2 << "\t\tUnityResolve::UnityType::GameObject* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Transform") {
                        io2 << "\t\tUnityResolve::UnityType::Transform* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Animator") {
                        io2 << "\t\tUnityResolve::UnityType::Animator* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Physics") {
                        io2 << "\t\tUnityResolve::UnityType::Physics* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Component") {
                        io2 << "\t\tUnityResolve::UnityType::Component* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Rect") {
                        io2 << "\t\tUnityResolve::UnityType::Rect " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Rect)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Rect)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Quaternion") {
                        io2 << "\t\tUnityResolve::UnityType::Quaternion " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Quaternion)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Quaternion)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Color") {
                        io2 << "\t\tUnityResolve::UnityType::Color " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Color)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Color)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Matrix4x4") {
                        io2 << "\t\tUnityResolve::UnityType::Matrix4x4 " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(UnityType::Matrix4x4)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(UnityType::Matrix4x4)) << "];\n";
                        }
                        continue;
                    }

                    if (field->type->name == "UnityEngine.Rigidbody") {
                        io2 << "\t\tUnityResolve::UnityType::Rigidbody* " << name << ";\n";
                        if (!pClass->fields[i + 1]->static_field && (pClass->fields[i + 1]->offset - field->offset) > sizeof(void*)) {
                            io2 << "\t\tchar " << name << "_[0x"
                                << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                                << (pClass->fields[i + 1]->offset - field->offset - sizeof(void*)) << "];\n";
                        }
                        continue;
                    }

                    io2 << "\t\tchar " << name << "[0x"
                        << std::hex << std::uppercase << std::setfill('0') << std::setw(6)
                        << (pClass->fields[i + 1]->offset - field->offset) << "];\n";

                }
    
                io2 << "\t}\n\n";
            }
        }
    
        io2 << '\n';
        io2.close();
    }

	static auto Get(const std::string& strAssembly) -> Assembly* {
		for (const auto pAssembly : assembly_) if (pAssembly->name == strAssembly) return pAssembly;
		return nullptr;
	}

	static auto ForeachAssembly() -> void {
        // 遍历程序集
        size_t     nrofassemblies = 0;
        const auto** assemblies = il2cpp_domain_get_assemblies( pDomain_, &nrofassemblies);
        for (auto i = 0; i < nrofassemblies; i++) {
            const auto* ptr = assemblies[i];
            if (ptr == nullptr) continue;
            auto       assembly = new Assembly{ 
                                .address = ptr 
                            };
            const auto image = il2cpp_assembly_get_image( ptr);
            assembly->file = il2cpp_image_get_filename( image);
            assembly->name = il2cpp_image_get_name( image);
            UnityResolve::assembly_.push_back(assembly);
            ForeachClass(assembly, image);
        }
    }

	static auto ForeachClass(Assembly* assembly, const Il2CppImage* image) -> void {
		// 遍历类
        const auto count = il2cpp_image_get_class_count( image);
        for (auto i = 0; i < count; i++) {
            const auto* pClass = il2cpp_image_get_class( image, i);
            if (pClass == nullptr) continue;
            const auto pAClass = new Class();
            pAClass->classinfo = pClass;
            pAClass->name = il2cpp_class_get_name((Il2CppClass*) pClass);
            if (const auto pPClass = il2cpp_class_get_parent((Il2CppClass*)  pClass)) 
                pAClass->parent = il2cpp_class_get_name( pPClass);
            pAClass->namespaze = il2cpp_class_get_namespace((Il2CppClass*)  pClass);
            assembly->classes.push_back(pAClass);

            ForeachFields(pAClass, pClass);
            ForeachMethod(pAClass, pClass);

            {
                // handle parent class 
                Il2CppClass* i_class = il2cpp_class_get_parent((Il2CppClass*) pClass);
                if(i_class){
                    ForeachFields(pAClass, i_class);
                    ForeachMethod(pAClass, i_class);
                }
            }

            {
                Il2CppClass* i_class{};
                void* iter{};
                do {
                    if ((i_class = il2cpp_class_get_interfaces((Il2CppClass*) pClass, &iter))) {
                        ForeachFields(pAClass, i_class);
                        ForeachMethod(pAClass, i_class);
                    }
                } while (i_class);
            }
        }
    }

	static auto ForeachFields(Class* klass, const Il2CppClass* pKlass) -> void {
		// 遍历成员
			void* iter = nullptr;
			FieldInfo* field;
			do {
				if ((field = il2cpp_class_get_fields((Il2CppClass*) pKlass, &iter))) {
					const auto pField = new Field{ 
                        .fieldinfo = field, 
                        .name = il2cpp_field_get_name( field), 
                        .type = new Type{
                            .address = il2cpp_field_get_type( field)
                        }, 
                        .klass = klass, 
                        .offset = (int)il2cpp_field_get_offset( field), 
                        .static_field = false, 
                        .vTable = nullptr 
                    };
					int        tSize{};
					pField->static_field = pField->offset <= 0;
					pField->type->name = il2cpp_type_get_name( pField->type->address);
					pField->type->size = -1;
					klass->fields.push_back(pField);
				}
			} while (field);
	}

	static auto ForeachMethod(Class* klass, const Il2CppClass* pKlass) -> void {
		// 遍历方法
			void* iter = nullptr;
			const MethodInfo* method;
			do {
				if ((method = il2cpp_class_get_methods( (Il2CppClass*)pKlass, &iter))) {
					uint32_t   fFlags{};
					const auto pMethod = new Method{};
					pMethod->address = method;
					pMethod->name = il2cpp_method_get_name( method);
					pMethod->klass = klass;
					pMethod->return_type = new Type{ 
                        .address = il2cpp_method_get_return_type( method), 
                    };
					pMethod->flags = il2cpp_method_get_flags( method, &fFlags);

					int        tSize{};
					pMethod->static_function = pMethod->flags & 0x10;
					pMethod->return_type->name = il2cpp_type_get_name( pMethod->return_type->address);
					pMethod->return_type->size = -1;
					pMethod->function = *(void**)(method);
					klass->methods.push_back(pMethod);
					const auto argCount = il2cpp_method_get_param_count( method);
					for (auto index = 0; index < argCount; index++) 
                        pMethod->args.push_back(
                            new Method::Arg{ 
                                il2cpp_method_get_param_name( method, index), 
                                new Type{
                                    .address = il2cpp_method_get_param( method, index), 
                                    .name = il2cpp_type_get_name( il2cpp_method_get_param( method, index)), 
                                    .size = -1
                                } 
                            });
				}
			} while (method);
	}

	struct UnityType final {

		struct Vector3;
		struct Camera;
		struct Transform;
		struct Component;
		struct UnityObject;
		struct LayerMask;
		struct Rigidbody;
		struct Physics;
		struct GameObject;
		struct Collider;
		struct Vector4;
		struct Vector2;
		struct Quaternion;
		struct Bounds;
		struct Plane;
		struct Ray;
		struct Rect;
		struct Color;
		struct Matrix4x4;
		template <typename T>
		struct Array;
		struct String;
		struct Object;
		template <typename T>
		struct List;
		template <typename TKey, typename TValue>
		struct Dictionary;
		struct Behaviour;
		struct MonoBehaviour;
		struct CsType;
		struct Mesh;
		struct Renderer;
		struct Animator;
		struct CapsuleCollider;
		struct BoxCollider;

		struct Vector3 {
			float x, y, z;

			Vector3() { x = y = z = 0.f; }

			Vector3(const float f1, const float f2, const float f3) {
				x = f1;
				y = f2;
				z = f3;
			}

			[[nodiscard]] auto Length() const -> float { return x * x + y * y + z * z; }

			[[nodiscard]] auto Dot(const Vector3 b) const -> float { return x * b.x + y * b.y + z * b.z; }

			[[nodiscard]] auto Normalize() const -> Vector3 {
                const auto len = Length();
				if (len > 0) return Vector3(x / len, y / len, z / len);
				return Vector3(x, y, z);
			}

			auto ToVectors(Vector3* m_pForward, Vector3* m_pRight, Vector3* m_pUp) const -> void {
				constexpr auto m_fDeg2Rad = static_cast<float>(3.1415926) / 180.F;

				const auto m_fSinX = sinf(x * m_fDeg2Rad);
				const auto m_fCosX = cosf(x * m_fDeg2Rad);

				const auto m_fSinY = sinf(y * m_fDeg2Rad);
				const auto m_fCosY = cosf(y * m_fDeg2Rad);

				const auto m_fSinZ = sinf(z * m_fDeg2Rad);
				const auto m_fCosZ = cosf(z * m_fDeg2Rad);

				if (m_pForward) {
					m_pForward->x = m_fCosX * m_fCosY;
					m_pForward->y = -m_fSinX;
					m_pForward->z = m_fCosX * m_fSinY;
				}

				if (m_pRight) {
					m_pRight->x = -1.f * m_fSinZ * m_fSinX * m_fCosY + -1.f * m_fCosZ * -m_fSinY;
					m_pRight->y = -1.f * m_fSinZ * m_fCosX;
					m_pRight->z = -1.f * m_fSinZ * m_fSinX * m_fSinY + -1.f * m_fCosZ * m_fCosY;
				}

				if (m_pUp) {
					m_pUp->x = m_fCosZ * m_fSinX * m_fCosY + -m_fSinZ * -m_fSinY;
					m_pUp->y = m_fCosZ * m_fCosX;
					m_pUp->z = m_fCosZ * m_fSinX * m_fSinY + -m_fSinZ * m_fCosY;
				}
			}

			[[nodiscard]] auto Distance(const Vector3& event) const -> float {
				const auto dx = this->x - event.x;
				const auto dy = this->y - event.y;
				const auto dz = this->z - event.z;
				return std::sqrt(dx * dx + dy * dy + dz * dz);
			}

			auto operator*(const float x) -> Vector3 {
				this->x *= x;
				this->y *= x;
				this->z *= x;
				return *this;
			}

			auto operator-(const float x) -> Vector3 {
				this->x -= x;
				this->y -= x;
				this->z -= x;
				return *this;
			}

			auto operator+(const float x) -> Vector3 {
				this->x += x;
				this->y += x;
				this->z += x;
				return *this;
			}

			auto operator/(const float x) -> Vector3 {
				this->x /= x;
				this->y /= x;
				this->z /= x;
				return *this;
			}

			auto operator*(const Vector3 x) -> Vector3 {
				this->x *= x.x;
				this->y *= x.y;
				this->z *= x.z;
				return *this;
			}

			auto operator-(const Vector3 x) -> Vector3 {
				this->x -= x.x;
				this->y -= x.y;
				this->z -= x.z;
				return *this;
			}

			auto operator+(const Vector3 x) -> Vector3 {
				this->x += x.x;
				this->y += x.y;
				this->z += x.z;
				return *this;
			}

			auto operator/(const Vector3 x) -> Vector3 {
				this->x /= x.x;
				this->y /= x.y;
				this->z /= x.z;
				return *this;
			}
		};

		struct Vector2 {
			float x, y;

			Vector2() { x = y = 0.f; }

			Vector2(const float f1, const float f2) {
				x = f1;
				y = f2;
			}

			[[nodiscard]] auto Distance(const Vector2& event) const -> float {
				const auto dx = this->x - event.x;
				const auto dy = this->y - event.y;
				return std::sqrt(dx * dx + dy * dy);
			}

			auto operator*(const float x) -> Vector2 {
				this->x *= x;
				this->y *= x;
				return *this;
			}

			auto operator/(const float x) -> Vector2 {
				this->x /= x;
				this->y /= x;
				return *this;
			}

			auto operator+(const float x) -> Vector2 {
				this->x += x;
				this->y += x;
				return *this;
			}

			auto operator-(const float x) -> Vector2 {
				this->x -= x;
				this->y -= x;
				return *this;
			}

			auto operator*(const Vector2 x) -> Vector2 {
				this->x *= x.x;
				this->y *= x.y;
				return *this;
			}

			auto operator-(const Vector2 x) -> Vector2 {
				this->x -= x.x;
				this->y -= x.y;
				return *this;
			}

			auto operator+(const Vector2 x) -> Vector2 {
				this->x += x.x;
				this->y += x.y;
				return *this;
			}

			auto operator/(const Vector2 x) -> Vector2 {
				this->x /= x.x;
				this->y /= x.y;
				return *this;
			}
		};

		struct Vector4 {
			float x, y, z, w;

			Vector4() { x = y = z = w = 0.F; }

			Vector4(const float f1, const float f2, const float f3, const float f4) {
				x = f1;
				y = f2;
				z = f3;
				w = f4;
			}

			auto operator*(const float x) -> Vector4 {
				this->x *= x;
				this->y *= x;
				this->z *= x;
				this->w *= x;
				return *this;
			}

			auto operator-(const float x) -> Vector4 {
				this->x -= x;
				this->y -= x;
				this->z -= x;
				this->w -= x;
				return *this;
			}

			auto operator+(const float x) -> Vector4 {
				this->x += x;
				this->y += x;
				this->z += x;
				this->w += x;
				return *this;
			}

			auto operator/(const float x) -> Vector4 {
				this->x /= x;
				this->y /= x;
				this->z /= x;
				this->w /= x;
				return *this;
			}

			auto operator*(const Vector4 x) -> Vector4 {
				this->x *= x.x;
				this->y *= x.y;
				this->z *= x.z;
				this->w *= x.w;
				return *this;
			}

			auto operator-(const Vector4 x) -> Vector4 {
				this->x -= x.x;
				this->y -= x.y;
				this->z -= x.z;
				this->w -= x.w;
				return *this;
			}

			auto operator+(const Vector4 x) -> Vector4 {
				this->x += x.x;
				this->y += x.y;
				this->z += x.z;
				this->w += x.w;
				return *this;
			}

			auto operator/(const Vector4 x) -> Vector4 {
				this->x /= x.x;
				this->y /= x.y;
				this->z /= x.z;
				this->w /= x.w;
				return *this;
			}
		};

		struct Quaternion {
			float x, y, z, w;

			Quaternion() { x = y = z = w = 0.F; }

			Quaternion(const float f1, const float f2, const float f3, const float f4) {
				x = f1;
				y = f2;
				z = f3;
				w = f4;
			}

			auto Euler(float m_fX, float m_fY, float m_fZ) -> Quaternion {
				constexpr auto m_fDeg2Rad = static_cast<float>(3.1415926) / 180.F;

				m_fX = m_fX * m_fDeg2Rad * 0.5F;
				m_fY = m_fY * m_fDeg2Rad * 0.5F;
				m_fZ = m_fZ * m_fDeg2Rad * 0.5F;

				const auto m_fSinX = sinf(m_fX);
				const auto m_fCosX = cosf(m_fX);

				const auto m_fSinY = sinf(m_fY);
				const auto m_fCosY = cosf(m_fY);

				const auto m_fSinZ = sinf(m_fZ);
				const auto m_fCosZ = cosf(m_fZ);

				x = m_fCosY * m_fSinX * m_fCosZ + m_fSinY * m_fCosX * m_fSinZ;
				y = m_fSinY * m_fCosX * m_fCosZ - m_fCosY * m_fSinX * m_fSinZ;
				z = m_fCosY * m_fCosX * m_fSinZ - m_fSinY * m_fSinX * m_fCosZ;
				w = m_fCosY * m_fCosX * m_fCosZ + m_fSinY * m_fSinX * m_fSinZ;

				return *this;
			}

			auto Euler(const Vector3& m_vRot) -> Quaternion { return Euler(m_vRot.x, m_vRot.y, m_vRot.z); }

			[[nodiscard]] auto ToEuler() const -> Vector3 {
				Vector3 m_vEuler;

				const auto m_fDist = (x * x) + (y * y) + (z * z) + (w * w);

				const auto m_fTest = x * w - y * z;
				if (m_fTest > 0.4995F * m_fDist) {
					m_vEuler.x = static_cast<float>(3.1415926) * 0.5F;
					m_vEuler.y = 2.F * atan2f(y, x);
					m_vEuler.z = 0.F;
				}
				else if (m_fTest < -0.4995F * m_fDist) {
					m_vEuler.x = static_cast<float>(3.1415926) * -0.5F;
					m_vEuler.y = -2.F * atan2f(y, x);
					m_vEuler.z = 0.F;
				}
				else {
					m_vEuler.x = asinf(2.F * (w * x - y * z));
					m_vEuler.y = atan2f(2.F * w * y + 2.F * z * x, 1.F - 2.F * (x * x + y * y));
					m_vEuler.z = atan2f(2.F * w * z + 2.F * x * y, 1.F - 2.F * (z * z + x * x));
				}

				constexpr auto m_fRad2Deg = 180.F / static_cast<float>(3.1415926);
				m_vEuler.x *= m_fRad2Deg;
				m_vEuler.y *= m_fRad2Deg;
				m_vEuler.z *= m_fRad2Deg;

				return m_vEuler;
			}

			auto operator*(const float x) -> Quaternion {
				this->x *= x;
				this->y *= x;
				this->z *= x;
				this->w *= x;
				return *this;
			}

			auto operator-(const float x) -> Quaternion {
				this->x -= x;
				this->y -= x;
				this->z -= x;
				this->w -= x;
				return *this;
			}

			auto operator+(const float x) -> Quaternion {
				this->x += x;
				this->y += x;
				this->z += x;
				this->w += x;
				return *this;
			}

			auto operator/(const float x) -> Quaternion {
				this->x /= x;
				this->y /= x;
				this->z /= x;
				this->w /= x;
				return *this;
			}

			auto operator*(const Quaternion x) -> Quaternion {
				this->x *= x.x;
				this->y *= x.y;
				this->z *= x.z;
				this->w *= x.w;
				return *this;
			}

			auto operator-(const Quaternion x) -> Quaternion {
				this->x -= x.x;
				this->y -= x.y;
				this->z -= x.z;
				this->w -= x.w;
				return *this;
			}

			auto operator+(const Quaternion x) -> Quaternion {
				this->x += x.x;
				this->y += x.y;
				this->z += x.z;
				this->w += x.w;
				return *this;
			}

			auto operator/(const Quaternion x) -> Quaternion {
				this->x /= x.x;
				this->y /= x.y;
				this->z /= x.z;
				this->w /= x.w;
				return *this;
			}
		};

		struct Bounds {
			Vector3 m_vCenter;
			Vector3 m_vExtents;
		};

		struct Plane {
			Vector3 m_vNormal;
			float   fDistance;
		};

		struct Ray {
			Vector3 m_vOrigin;
			Vector3 m_vDirection;
		};

		struct Rect {
			float fX, fY;
			float fWidth, fHeight;

			Rect() { fX = fY = fWidth = fHeight = 0.f; }

			Rect(const float f1, const float f2, const float f3, const float f4) {
				fX = f1;
				fY = f2;
				fWidth = f3;
				fHeight = f4;
			}
		};

		struct Color {
			float r, g, b, a;

			Color() { r = g = b = a = 0.f; }

			explicit Color(const float fRed = 0.f, const float fGreen = 0.f, const float fBlue = 0.f, const float fAlpha = 1.f) {
				r = fRed;
				g = fGreen;
				b = fBlue;
				a = fAlpha;
			}
		};

		struct Matrix4x4 {
			float m[4][4] = { {0} };

			Matrix4x4() = default;

			auto operator[](const int i) -> float* { return m[i]; }
		};

		struct Object {
			union {
				void* klass{ nullptr };
				void* vtable;
			} Il2CppClass;

			struct MonitorData* monitor{ nullptr };

			auto GetType() -> CsType* {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("Object")->Get<Method>("GetType");
				if (method) return method->Invoke<CsType*>(this);
                return nullptr;
				// throw std::logic_error("nullptr");
			}

			auto ToString() -> std::string {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("Object")->Get<Method>("ToString");
				if (method) return method->Invoke<String*>(this)->ToString();
                return std::string();
				// throw std::logic_error("nullptr");
			}
		};

		struct CsType {
			auto FormatTypeName() -> std::string {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("Type")->Get<Method>("FormatTypeName");
				if (method) return method->Invoke<String*>(this)->ToString();
                return std::string();
				// throw std::logic_error("nullptr");
			}

			auto GetFullName() -> std::string {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("Type")->Get<Method>("get_FullName");
				if (method) return method->Invoke<String*>(this)->ToString();
                return std::string();
				// throw std::logic_error("nullptr");
			}

			auto GetNamespace() -> std::string {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("Type")->Get<Method>("get_Namespace");
				if (method) return method->Invoke<String*>(this)->ToString();
                return std::string();
				// throw std::logic_error("nullptr");
			}
		};

		struct String : Object {
			int32_t m_stringLength{ 0 };
			wchar_t m_firstChar[32]{};

			[[nodiscard]] auto ToString() const -> std::string {
                auto utf16String = reinterpret_cast<const char16_t*>(m_firstChar);
                size_t utf16Length = m_stringLength; // Number of UTF-16 code units

                std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> convert;
                //std::string utf8String = convert.to_bytes(utf16String, utf16String + utf16Length);
                std::string utf8String = convert.to_bytes(utf16String, utf16String + utf16Length);
                return utf8String;
			}

			auto operator[](const int i) const -> wchar_t { return m_firstChar[i]; }

			auto Clear() -> void {
				memset(m_firstChar, 0, m_stringLength);
				m_stringLength = 0;
			}

			static auto New(const std::string& str) -> String* {
				return (String*)il2cpp_string_new( str.c_str());
			}
		};

		template <typename T>
		struct Array : Object {
			struct {
				std::uintptr_t length;
				std::int32_t   lower_bound;
			}*bounds{ nullptr };

			std::uintptr_t          max_length{ 0 };
			__declspec(align(8)) T* vector[32]{};

			auto GetData() -> uintptr_t { return reinterpret_cast<uintptr_t>(&vector); }

			auto operator[](const unsigned int m_uIndex) -> T& { return *reinterpret_cast<T*>(GetData() + sizeof(T) * m_uIndex); }

			auto At(const unsigned int m_uIndex) -> T& { return operator[](m_uIndex); }

			auto Insert(T* m_pArray, uintptr_t m_uSize, const uintptr_t m_uIndex = 0) -> void {
				if ((m_uSize + m_uIndex) >= max_length) {
					if (m_uIndex >= max_length) return;

					m_uSize = max_length - m_uIndex;
				}

				for (uintptr_t u = 0; m_uSize > u; ++u) operator[](u + m_uIndex) = m_pArray[u];
			}

			auto Fill(T m_tValue) -> void { for (uintptr_t u = 0; max_length > u; ++u) operator[](u) = m_tValue; }

			auto RemoveAt(const unsigned int m_uIndex) -> void {
				if (m_uIndex >= max_length) return;

				if (max_length > (m_uIndex + 1)) for (auto u = m_uIndex; (static_cast<unsigned int>(max_length) - m_uIndex) > u; ++u) operator[](u) = operator[](u + 1);

				--max_length;
			}

			auto RemoveRange(const unsigned int m_uIndex, unsigned int m_uCount) -> void {
				if (m_uCount == 0) m_uCount = 1;

				const auto m_uTotal = m_uIndex + m_uCount;
				if (m_uTotal >= max_length) return;

				if (max_length > (m_uTotal + 1)) for (auto u = m_uIndex; (static_cast<unsigned int>(max_length) - m_uTotal) >= u; ++u) operator[](u) = operator[](u + m_uCount);

				max_length -= m_uCount;
			}

			auto RemoveAll() -> void {
				if (max_length > 0) {
					memset(GetData(), 0, sizeof(Type) * max_length);
					max_length = 0;
				}
			}

			auto ToVector() -> std::vector<T> {
				std::vector<T> rs{};
				rs.reserve(this->max_length);
				for (auto i = 0; i < this->max_length; i++) rs.push_back(this->At(i));
				return rs;
			}

			static auto New(const Class* kalss, const std::uintptr_t size) -> Array* {
                auto* clz = (::Il2CppClass*) (kalss->classinfo);
				auto *array = il2cpp_array_new(clz, size);
				return (Array*)array;
			}
		};

		template <typename Type>
		struct List : Object {
			Array<Type>* pList;
			int size{};
			int version{};
			void* syncRoot{};

			auto ToArray() -> Array<Type>* { return pList; }

			static auto New(const Class* kalss, const std::uintptr_t size) -> List* {
				auto pList = new List<Type>();
				pList->pList = Array<Type>::New(kalss, size);
				pList->size = size;
			}

			auto operator[](const unsigned int m_uIndex) -> Type& { return pList->At(m_uIndex); }

			auto Add(Type* pDate) -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("Add");
				if (method) return method->Invoke<void>(this, pDate);
				// // throw std::logic_error("nullptr");
			}

			auto Remove(Type* pDate) -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("Remove");
				if (method) return method->Invoke<void>(this, pDate);
				// // throw std::logic_error("nullptr");
			}

			auto RemoveAt(int index) -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("RemoveAt");
				if (method) return method->Invoke<void>(this, index);
				// throw std::logic_error("nullptr");
			}

			auto ForEach(void(*action)(Type* pDate)) -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("ForEach");
				if (method) return method->Invoke<void>(this, action);
				// throw std::logic_error("nullptr");
			}

			auto GetRange(int index, int count) -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("GetRange");
				if (method) return method->Invoke<void>(this, index, count);
				// throw std::logic_error("nullptr");
			}

			auto Clear() -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("Clear");
				if (method) return method->Invoke<void>(this);
				// throw std::logic_error("nullptr");
			}

			auto Sort(int(*comparison)(Type* pX, Type* pY)) -> float {
				static Method* method;
				if (!method) method = Get("mscorlib.dll")->Get("List")->Get<Method>("Sort");
				if (method) return method->Invoke<void>(this, comparison);
				// throw std::logic_error("nullptr");
			}
		};

		template <typename TKey, typename TValue>
		struct Dictionary : Object {
			struct Entry {
				int    iHashCode;
				int    iNext;
				TKey   tKey;
				TValue tValue;
			};

			Array<int>* pBuckets;
			Array<Entry*>* pEntries;
			int            iCount;
			int            iVersion;
			int            iFreeList;
			int            iFreeCount;
			void* pComparer;
			void* pKeys;
			void* pValues;

			auto GetEntry() -> Entry* { return static_cast<Entry*>(pEntries->GetData()); }

			auto GetKeyByIndex(const int iIndex) -> TKey {
				TKey tKey = { 0 };

				Entry* pEntry = GetEntry();
				if (pEntry) tKey = pEntry[iIndex].m_tKey;

				return tKey;
			}

			auto GetValueByIndex(const int iIndex) -> TValue {
				TValue tValue = { 0 };

				Entry* pEntry = GetEntry();
				if (pEntry) tValue = pEntry[iIndex].m_tValue;

				return tValue;
			}

			auto GetValueByKey(const TKey tKey) -> TValue {
				TValue tValue = { 0 };
				for (auto i = 0; i < iCount; i++) if (GetEntry()[i].m_tKey == tKey) tValue = GetEntry()[i].m_tValue;
				return tValue;
			}

			auto operator[](const TKey tKey) const -> TValue { return GetValueByKey(tKey); }
		};

		struct UnityObject : Object {
			void* m_CachedPtr;

			auto GetName() -> std::string {
				LOG_INFOS("m_ChachedPtr %p", m_CachedPtr);
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Object")->Get<Method>("get_name");
				LOG_INFOS("method %p", method);
				if (method) return method->Invoke<String*>(this)->ToString();
				LOG_INFOS("nullptr");
				// throw std::logic_error("nullptr");
                return {};
			}

			auto ToString() -> std::string {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Object")->Get<Method>("ToString");
				if (method) return method->Invoke<String*>(this)->ToString();
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto ToString(UnityObject* obj) -> std::string {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Object")->Get<Method>("ToString", { "*" });
				if (method) return method->Invoke<String*>(obj)->ToString();
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto Instantiate(UnityObject* original) -> UnityObject* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Object")->Get<Method>("Instantiate", { "*" });
				if (method) return method->Invoke<UnityObject*>(original);
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto Destroy(UnityObject* original) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Object")->Get<Method>("Destroy", { "*" });
				if (method) return method->Invoke<void>(original);
				// throw std::logic_error("nullptr");
			}
		};

		struct Component : UnityObject {
			auto GetTransform() -> Transform* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("get_transform");
				if (method) return method->Invoke<Transform*>(this);
				return nullptr;
			}

			auto GetGameObject() -> GameObject* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("get_gameObject");
				if (method) return method->Invoke<GameObject*>(this);
				// throw std::logic_error("nullptr");
                return nullptr;
			}

			auto GetTag() -> std::string {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("get_tag");
				if (method) return method->Invoke<String*>(this)->ToString();
				// throw std::logic_error("nullptr");
                return {};
			}

			template <typename T>
			auto GetComponentsInChildren() -> std::vector<T> {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponentsInChildren");
				if (method) return method->Invoke<Array<T>*>(this)->ToVector();
				return {};
			}

			template <typename T>
			auto GetComponentsInChildren(Class* pClass) -> std::vector<T> {
				static Method* method;
				static void* obj;
				if (!method || !obj) { 
					method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponentsInChildren", { "System.Type" });
					obj = pClass->GetType().GetObject();
				}
				if (method) return method->Invoke<Array<T>*>(this, obj)->ToVector();
				return {};
			}

			template <typename T>
			auto GetComponents() -> std::vector<T> {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponents");
				if (method) return method->Invoke<Array<T>*>(this)->ToVector();
				return {};
			}

			template <typename T>
			auto GetComponents(Class* pClass) -> std::vector<T> {
				static Method* method;
				static void* obj;
				if (!method || !obj) {
					method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponents", { "System.Type" });
					obj = pClass->GetType().GetObject();
				}
				if (method) return method->Invoke<Array<T>*>(this, obj)->ToVector();
				return {};
			}

			template <typename T>
			auto GetComponentsInParent() -> std::vector<T> {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponentsInParent");
				if (method) return method->Invoke<Array<T>*>(this)->ToVector();
				return {};
			}

			template <typename T>
			auto GetComponentsInParent(Class* pClass) -> std::vector<T> {
				static Method* method;
				static void* obj;
				if (!method || !obj) {
					method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponentsInParent", { "System.Type" });
					obj = pClass->GetType().GetObject();
				}
				if (method) return method->Invoke<Array<T>*>(this, obj)->ToVector();
				return {};
			}

			template <typename T>
			auto GetComponentInChildren(Class* pClass) -> T {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponentInChildren", { "System.Type" });;
				if (method) return method->Invoke<T>(this, pClass->GetType().GetObject());
				return T();
			}

			template <typename T>
			auto GetComponentInParent(Class* pClass) -> T {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Component")->Get<Method>("GetComponentInParent", { "System.Type" });;
				if (method) return method->Invoke<T>(this, pClass->GetType().GetObject());
				return T();
			}
		};

		struct Camera : Component {
			enum class Eye : int {
				Left,
				Right,
				Mono
			};

			static auto GetMain() -> Camera* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("get_main");
				if (method) return method->Invoke<Camera*>();
				// throw std::logic_error("nullptr");
                return nullptr;
			}

			static auto GetCurrent() -> Camera* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("get_current");
				if (method) return method->Invoke<Camera*>();
				// throw std::logic_error("nullptr");
                return nullptr;
			}

			static auto GetAllCount() -> int {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("get_allCamerasCount");
				if (method) return method->Invoke<int>();
				// throw std::logic_error("nullptr");
                return -1;
			}

			static auto GetAllCamera() -> std::vector<Camera*> {
				static Method* method;
				static Class* klass;

				if (!method || !klass) {
					method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("GetAllCameras", { "*" });
					klass = Get("UnityEngine.CoreModule.dll")->Get("Camera");
				}

				if (method && klass) {
					const auto array = Array<Camera*>::New(klass, GetAllCount());
					method->Invoke<int>(array);
					return array->ToVector();
				}

				// throw std::logic_error("nullptr");
                return std::vector<Camera*>();
			}

			auto GetDepth() -> float {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("get_depth");
				if (method) return method->Invoke<float>(this);
				// throw std::logic_error("nullptr");
                return 0.f;
			}

			auto SetDepth(const float depth) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("set_depth", { "*" });
				if (method) return method->Invoke<void>(this, depth);
			}

			auto WorldToScreenPoint(const Vector3& position, const Eye eye) -> Vector3 {
				static Method* method;
				if (!method) { 
						method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>("WorldToScreenPoint", {"*", "*"});
				} 
				if (method) return method->Invoke<Vector3>(this, position, eye);
				return {};
			}

			auto ScreenToWorldPoint(const Vector3& position, const Eye eye) -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>( "ScreenToWorldPoint");
				if (method) return method->Invoke<Vector3>(this, position, eye);
				return {};
			}

			auto CameraToWorldMatrix() -> Matrix4x4 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Camera")->Get<Method>( "get_cameraToWorldMatrix");
				if (method) return method->Invoke<Matrix4x4>(this);
				return {};
			}
		};

		struct Transform : Component {
			auto GetPosition() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("get_position");
				if (method) return method->Invoke<Vector3>(this);
				return {};
			}

			auto SetPosition(const Vector3& position) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "set_position");
				if (method) return method->Invoke<void>(this, position);
				return;
			}

			auto GetRotation() -> Quaternion {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "get_rotation");
				if (method) return method->Invoke<Quaternion>(this);
				return {};
			}

			auto SetRotation(const Quaternion& position) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "set_rotation");
				if (method) return method->Invoke<void>(this, position);
				return;
			}

			auto GetLocalPosition() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "get_localPosition");
				if (method) return method->Invoke<Vector3>(this);
				return {};
			}

			auto SetLocalPosition(const Vector3& position) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "set_localPosition");
				if (method) return method->Invoke<void>(this, position);
				return;
			}

			auto GetLocalRotation() -> Quaternion {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "get_localRotation");
				if (method) return method->Invoke<Quaternion>(this);
				return {};
			}

			auto SetLocalRotation(const Quaternion& position) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "set_localRotation");
				if (method) return method->Invoke<void>(this, position);
				return;
			}

			auto GetLocalScale() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "get_localScale");
				if (method) return method->Invoke<Vector3>(this);
				return {};
			}

			auto SetLocalScale(const Vector3& position) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "set_localScale");
				if (method) return method->Invoke<void>(this, position);
				return;
			}

			auto GetChildCount() -> int {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("get_childCount");
				if (method) return method->Invoke<int>(this);
				return 0;
			}

			auto GetChild(const int index) -> Transform* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("GetChild");
				if (method) return method->Invoke<Transform*>(this, index);
				return nullptr;
			}

			auto GetRoot() -> Transform* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("GetRoot");
				if (method) return method->Invoke<Transform*>(this);
				return nullptr;
			}

			auto GetParent() -> Transform* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("GetParent");
				if (method) return method->Invoke<Transform*>(this);
				return nullptr;
			}

			auto GetLossyScale() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "get_lossyScale");
				if (method) return method->Invoke<Vector3>(this);
				return {};
			}

			auto TransformPoint(const Vector3& position) -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>( "TransformPoint");
				if (method) return method->Invoke<Vector3>(this, position);
				return {};
			}

			auto LookAt(const Vector3& worldPosition) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("LookAt", { "Vector3" });
				if (method) return method->Invoke<void>(this, worldPosition);
				return;
			}

			auto Rotate(const Vector3& eulers) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Transform")->Get<Method>("Rotate", { "Vector3" });
				if (method) return method->Invoke<void>(this, eulers);
				return;
			}

            auto DumpChildren(std::function<bool(Transform*, int)> cb) -> int {
                // Create a std::function to hold the lambda
                std::function<bool(Transform*, int)> _fun;

                // Define the lambda, capturing the std::function by reference
                _fun = [&_fun, cb](Transform* t, int level) -> int {
                    int childCount = t->GetChildCount();
                    for (int idx = 0; idx < childCount; ++idx) {
                        Transform* c = t->GetChild(idx);
                        bool cont = cb(c, level);
                        if (!cont) {
                            break;
                        }
                        // Recursive call
                        _fun(c, level + 1);
                    }
                    return childCount; // if you want to signal continuation
                };

                // Start the recursion with the 'this' pointer and level 0
                return _fun(this, 0);

            }
		};

		struct GameObject : UnityObject {
			static auto Create(GameObject* obj, const std::string& name) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("Internal_CreateGameObject");
				if (method) method->Invoke<void, GameObject*, String*>(obj, String::New(name));
				// throw std::logic_error("nullptr");
			}

			static auto FindGameObjectsWithTag(const std::string& name) -> std::vector<GameObject*> {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("FindGameObjectsWithTag");
				if (method) {
					std::vector<GameObject*> rs{};
					const auto               array = method->Invoke<Array<GameObject*>*>(String::New(name));
					rs.reserve(array->max_length);
					for (auto i = 0; i < array->max_length; i++) rs.push_back(array->At(i));
					return rs;
				}
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto Find(const std::string& name) -> GameObject* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("Find");
				if (method) return method->Invoke<GameObject*>(String::New(name));
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetTransform() -> Transform* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("get_transform");
				if (method) return method->Invoke<Transform*>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetIsStatic() -> bool {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("get_isStatic");
				if (method) return method->Invoke<bool>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetTag() -> String* {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("get_tag");
				if (method) return method->Invoke<String*>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			template <typename T>
			auto GetComponent() -> T {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("GetComponent");
				if (method) return method->Invoke<T>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			template <typename T>
			auto GetComponent(const Class* type) -> T {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("GetComponent", { "System.Type" });
				if (method) return method->Invoke<T>(this, type->GetType().GetObject());
				// throw std::logic_error("nullptr");
                return {};
			}

			template <typename T>
			auto GetComponentInChildren(const Class* type) -> T {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("GetComponentInChildren", { "System.Type" });
				if (method) return method->Invoke<T>(this, type->GetType().GetObject());
				// throw std::logic_error("nullptr");
                return {};
			}

			template <typename T>
			auto GetComponentInParent(const Class* type) -> T {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("GetComponentInParent", { "System.Type" });
				if (method) return method->Invoke<T>(this, type->GetType().GetObject());
				// throw std::logic_error("nullptr");
			}

			template <typename T>
			auto GetComponents(Class* type, bool useSearchTypeAsArrayReturnType = false, bool recursive = false, bool includeInactive = true, bool reverse = false, List<T>* resultList = nullptr) -> std::vector<T> {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("GameObject")->Get<Method>("GetComponentsInternal");
				if (method) return method->Invoke<Array<T>*>(this, type->GetType().GetObject(), useSearchTypeAsArrayReturnType, recursive, includeInactive, reverse, resultList)->ToVector();
                return {};
				// throw std::logic_error("nullptr");
			}

			template <typename T>
			auto GetComponentsInChildren(Class* type, const bool includeInactive = false) -> std::vector<T> { return GetComponents<T>(type, false, true, includeInactive, false, nullptr); }


			template <typename T>
			auto GetComponentsInParent(Class* type, const bool includeInactive = false) -> std::vector<T> { return GetComponents<T>(type, false, true, includeInactive, true, nullptr); }
		};

		struct LayerMask : Object {
			int m_Mask;

			static auto NameToLayer(const std::string& layerName) -> int {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("LayerMask")->Get<Method>("NameToLayer");
				if (method) return method->Invoke<int>(String::New(layerName));
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto LayerToName(const int layer) -> std::string {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("LayerMask")->Get<Method>("LayerToName");
				if (method) return method->Invoke<String*>(layer)->ToString();
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct Rigidbody : Component {
			auto GetDetectCollisions() -> bool {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Rigidbody")->Get<Method>("get_detectCollisions");
				if (method) return method->Invoke<bool>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto SetDetectCollisions(const bool value) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Rigidbody")->Get<Method>("set_detectCollisions");
				if (method) return method->Invoke<void>(this, value);
				// throw std::logic_error("nullptr");
			}

			auto GetVelocity() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Rigidbody")->Get<Method>( "get_velocity");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto SetVelocity(Vector3 value) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Rigidbody")->Get<Method>( "set_velocity");
				if (method) return method->Invoke<void>(this, value);
				// throw std::logic_error("nullptr");
			}
		};

		struct Collider : Component {
			auto GetBounds() -> Bounds {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Collider")->Get<Method>("get_bounds_Injected");
				if (method) {
					Bounds bounds;
					method->Invoke<void>(this, &bounds);
					return bounds;
				}
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct Mesh : UnityObject {
			auto GetBounds() -> Bounds {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Mesh")->Get<Method>("get_bounds_Injected");
				if (method) {
					Bounds bounds;
					method->Invoke<void>(this, &bounds);
					return bounds;
				}
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct CapsuleCollider : Collider {
			auto GetCenter() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("CapsuleCollider")->Get<Method>("get_center");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetDirection() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("CapsuleCollider")->Get<Method>("get_direction");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetHeightn() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("CapsuleCollider")->Get<Method>("get_height");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetRadius() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("CapsuleCollider")->Get<Method>("get_radius");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct BoxCollider : Collider {
			auto GetCenter() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("BoxCollider")->Get<Method>("get_center");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto GetSize() -> Vector3 {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("BoxCollider")->Get<Method>("get_size");
				if (method) return method->Invoke<Vector3>(this);
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct Renderer : Component {
			auto GetBounds() -> Bounds {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Renderer")->Get<Method>("get_bounds_Injected");
				if (method) {
					Bounds bounds;
					method->Invoke<void>(this, &bounds);
					return bounds;
				}
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct Behaviour : Component {
			auto GetEnabled() -> bool {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Behaviour")->Get<Method>("get_enabled");
				if (method) return method->Invoke<bool>(this);
				// throw std::logic_error("nullptr");
                return {};
			}

			auto SetEnabled(const bool value) -> bool {
				static Method* method;
				if (!method) method = Get("UnityEngine.CoreModule.dll")->Get("Behaviour")->Get<Method>("set_enabled");
				if (method) return method->Invoke<bool>(this, value);
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		struct MonoBehaviour : Behaviour {
		};

		struct Physics : Object {
			static auto Linecast(const Vector3& start, const Vector3& end) -> bool {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Physics")->Get<Method>("Linecast", { "*", "*" });
				if (method) return method->Invoke<bool>(start, end);
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto Raycast(const Vector3& origin, const Vector3& direction, const float maxDistance) -> bool {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Physics")->Get<Method>("Raycast", { "*", "*", "*" });
				if (method) return method->Invoke<bool>(origin, direction, maxDistance);
				// throw std::logic_error("nullptr");
                return {};
			}

			static auto IgnoreCollision(Collider* collider1, Collider* collider2) -> void {
				static Method* method;
				if (!method) method = Get("UnityEngine.PhysicsModule.dll")->Get("Physics")->Get<Method>("IgnoreCollision1", { "*", "*" });
				if (method) return method->Invoke<void>(collider1, collider2);
				// throw std::logic_error("nullptr");
			}
		};

		struct Animator : Behaviour {
			enum class HumanBodyBones : int {
				Hips,
				LeftUpperLeg,
				RightUpperLeg,
				LeftLowerLeg,
				RightLowerLeg,
				LeftFoot,
				RightFoot,
				Spine,
				Chest,
				UpperChest = 54,
				Neck = 9,
				Head,
				LeftShoulder,
				RightShoulder,
				LeftUpperArm,
				RightUpperArm,
				LeftLowerArm,
				RightLowerArm,
				LeftHand,
				RightHand,
				LeftToes,
				RightToes,
				LeftEye,
				RightEye,
				Jaw,
				LeftThumbProximal,
				LeftThumbIntermediate,
				LeftThumbDistal,
				LeftIndexProximal,
				LeftIndexIntermediate,
				LeftIndexDistal,
				LeftMiddleProximal,
				LeftMiddleIntermediate,
				LeftMiddleDistal,
				LeftRingProximal,
				LeftRingIntermediate,
				LeftRingDistal,
				LeftLittleProximal,
				LeftLittleIntermediate,
				LeftLittleDistal,
				RightThumbProximal,
				RightThumbIntermediate,
				RightThumbDistal,
				RightIndexProximal,
				RightIndexIntermediate,
				RightIndexDistal,
				RightMiddleProximal,
				RightMiddleIntermediate,
				RightMiddleDistal,
				RightRingProximal,
				RightRingIntermediate,
				RightRingDistal,
				RightLittleProximal,
				RightLittleIntermediate,
				RightLittleDistal,
				LastBone = 55
			};

			auto GetBoneTransform(const HumanBodyBones humanBoneId) -> Transform* {
				static Method* method;
				if (!method) method = Get("UnityEngine.AnimationModule.dll")->Get("Animator")->Get<Method>("GetBoneTransform");
				if (method) return method->Invoke<Transform*>(this, humanBoneId);
				// throw std::logic_error("nullptr");
                return {};
			}
		};

		template <typename Return, typename... Args>
		static auto Invoke(const void* address, Args... args) -> Return {

            if (address != nullptr) return reinterpret_cast<Return(*)(Args...)>(address)(args...);
                
			return Return();
		}
	};

public:
    static std::vector<Assembly*> assembly_;
	static std::unordered_map<std::string, void*> address_;
	static Il2CppDomain* pDomain_;
	static Il2CppThread* pThread_;

};

